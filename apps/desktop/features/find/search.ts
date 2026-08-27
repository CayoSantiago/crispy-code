import { spawn } from 'node:child_process'
import path from 'node:path'
import { z } from 'zod/v4'
import type {
  FindConfig,
  LocalRootSource,
} from '@/features/find/config/schemas'
import { pathExists } from '@/lib/fs'
import type { SearchLineEvent } from './cluster-search-lines'
import { createSourceMatchBudget } from './search-budget'
import type { SearchMode } from './schemas'

export type { SearchMode }

export type SearchOptions = {
  query: string
  mode: SearchMode
  caseSensitive: boolean
  pathGlob: string
  maxResultsPerSource?: number
}

export type SearchSource = {
  id: string
  label: string
  rootPath: string
  kind: 'local'
}

const rgDataSchema = z.object({
  path: z.object({ text: z.string() }),
  lines: z.object({ text: z.string() }),
  line_number: z.number(),
  submatches: z
    .array(z.object({ start: z.number(), end: z.number() }))
    .optional()
    .default([]),
})

const rgLineEventSchema = z.object({
  type: z.enum(['match', 'context']),
  data: rgDataSchema,
})

type RgLineEvent = z.infer<typeof rgLineEventSchema>

function sourceFromLocal(localRoot: LocalRootSource): SearchSource {
  return {
    id: `local:${localRoot.id}`,
    label: path.basename(localRoot.path) || localRoot.path,
    rootPath: localRoot.path,
    kind: 'local',
  }
}

export async function getSearchSources(config: FindConfig): Promise<{
  available: SearchSource[]
  missing: SearchSource[]
}> {
  const available: SearchSource[] = []
  const missing: SearchSource[] = []

  for (const source of config.localRoots.map(sourceFromLocal)) {
    if (await pathExists(source.rootPath)) {
      available.push(source)
    } else {
      missing.push(source)
    }
  }

  return { available, missing }
}

function projectNameFor(source: SearchSource, relativePath: string): string {
  const [head] = relativePath.split(path.sep)
  return head?.length ? head : source.label
}

function parseJsonLine(line: string): RgLineEvent | null {
  try {
    const result = rgLineEventSchema.safeParse(JSON.parse(line))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

function runRipgrep(
  source: SearchSource,
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchLineEvent[]> {
  if (signal?.aborted) {
    return Promise.resolve([])
  }

  const pathGlob = options.pathGlob.trim()
  const maxResults = options.maxResultsPerSource ?? 100
  const args = [
    '--json',
    '--line-number',
    '--ignore-case',
    '--context',
    '2',
  ]

  if (options.caseSensitive) {
    args.push('--case-sensitive')
  }
  if (options.mode === 'literal') {
    args.push('--fixed-strings')
  }
  if (pathGlob) {
    args.push('--glob', pathGlob)
  }
  args.push('--regexp', options.query)

  return new Promise((resolve, reject) => {
    const child = spawn('rg', args, {
      cwd: source.rootPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const results: SearchLineEvent[] = []
    const matchBudget = createSourceMatchBudget(maxResults)
    let stdout = ''
    let stderr = ''
    let didAbort = false
    let didReachBudget = false

    const onAbort = () => {
      didAbort = true
      child.kill()
      resolve([])
    }

    signal?.addEventListener('abort', onAbort)

    child.stdout.on('data', (chunk: Buffer) => {
      if (didReachBudget) return

      stdout += chunk.toString('utf8')
      const lines = stdout.split('\n')
      stdout = lines.pop() ?? ''

      for (const line of lines) {
        const event = parseJsonLine(line)
        if (!event) continue

        const relativePath = event.data.path.text
        const normalizedRelative = relativePath.split('/').join(path.sep)
        const kind = event.type === 'match' ? 'match' : 'context'
        if (!matchBudget.accept(kind)) {
          didReachBudget = true
          child.kill()
          break
        }

        results.push({
          sourceId: source.id,
          sourceLabel: source.label,
          sourceKind: source.kind,
          absolutePath: path.join(source.rootPath, normalizedRelative),
          relativePath: normalizedRelative,
          lineNumber: event.data.line_number,
          lineText: event.data.lines.text.replace(/\n$/, ''),
          kind,
          matchRanges:
            kind === 'match'
              ? event.data.submatches.map((submatch) => ({
                  start: submatch.start,
                  end: submatch.end,
                }))
              : [],
          projectName: projectNameFor(source, normalizedRelative),
        })

        if (matchBudget.reached) {
          didReachBudget = true
          child.kill()
          break
        }
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (error) => {
      signal?.removeEventListener('abort', onAbort)
      reject(error)
    })

    child.on('close', (code) => {
      signal?.removeEventListener('abort', onAbort)

      if (didAbort) {
        resolve([])
      } else if (didReachBudget || code === 0 || code === 1) {
        resolve(results)
      } else {
        reject(new Error(stderr || `ripgrep exited with code ${code}`))
      }
    })
  })
}

export async function searchAcrossSources(
  sources: SearchSource[],
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchLineEvent[]> {
  const query = options.query.trim()
  if (!query) return []

  const all = await Promise.all(
    sources.map((source) => runRipgrep(source, options, signal)),
  )

  return all
    .flat()
    .sort((left, right) => left.sourceLabel.localeCompare(right.sourceLabel))
}
