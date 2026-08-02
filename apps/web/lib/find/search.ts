import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import {
  FIND_MIRROR_ROOT,
  type FindConfig,
  type GitHubRepoSource,
  type LocalRootSource,
} from './config'

export type SearchMode = 'literal' | 'regex'

export type SearchOptions = {
  query: string
  mode: SearchMode
  caseSensitive: boolean
  wholeWord: boolean
  extension: string
  pathFilter: string
  sourceFilter: string
  maxResultsPerSource?: number
}

export type SearchSource = {
  id: string
  label: string
  rootPath: string
  kind: 'local' | 'github'
}

export type SearchMatch = {
  sourceId: string
  sourceLabel: string
  sourceKind: 'local' | 'github'
  absolutePath: string
  relativePath: string
  lineNumber: number
  lineText: string
  matchRanges: Array<{ start: number; end: number }>
  projectName: string
}

type RgMatchEvent = {
  type: 'match'
  data: {
    path: { text: string }
    lines: { text: string }
    line_number: number
    submatches: Array<{ start: number; end: number }>
  }
}

function normalizePathFilter(filter: string): string {
  return filter.trim().toLowerCase()
}

function normalizeExtension(extension: string): string {
  const normalized = extension.trim().toLowerCase()

  if (!normalized) {
    return ''
  }

  return normalized.startsWith('.') ? normalized : `.${normalized}`
}

async function pathExists(inputPath: string): Promise<boolean> {
  try {
    await stat(inputPath)
    return true
  } catch {
    return false
  }
}

function sourceFromLocal(localRoot: LocalRootSource): SearchSource {
  return {
    id: `local:${localRoot.id}`,
    label: path.basename(localRoot.path) || localRoot.path,
    rootPath: localRoot.path,
    kind: 'local',
  }
}

function sourceFromGitHub(repo: GitHubRepoSource): SearchSource {
  return {
    id: `github:${repo.id}`,
    label: `${repo.owner}/${repo.repo}`,
    rootPath: path.join(FIND_MIRROR_ROOT, repo.owner, repo.repo),
    kind: 'github',
  }
}

export async function getSearchSources(config: FindConfig): Promise<{
  available: SearchSource[]
  missing: SearchSource[]
}> {
  const all = [
    ...config.localRoots.map(sourceFromLocal),
    ...config.githubRepos.map(sourceFromGitHub),
  ]

  const available: SearchSource[] = []
  const missing: SearchSource[] = []

  for (const source of all) {
    if (await pathExists(source.rootPath)) {
      available.push(source)
    } else {
      missing.push(source)
    }
  }

  return { available, missing }
}

function projectNameFor(source: SearchSource, relativePath: string): string {
  if (source.kind === 'github') {
    return source.label
  }

  const [head] = relativePath.split(path.sep)
  return head?.length ? head : source.label
}

function parseJsonLine(line: string): RgMatchEvent | null {
  try {
    const parsed = JSON.parse(line) as { type?: string }
    return parsed.type === 'match' ? (parsed as RgMatchEvent) : null
  } catch {
    return null
  }
}

function runRipgrep(
  source: SearchSource,
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchMatch[]> {
  if (signal?.aborted) {
    return Promise.resolve([])
  }

  const extension = normalizeExtension(options.extension)
  const pathFilter = normalizePathFilter(options.pathFilter)
  const maxResults = options.maxResultsPerSource ?? 100

  const args = [
    '--json',
    '--line-number',
    '--max-count',
    String(maxResults),
    '--ignore-case',
  ]

  if (options.caseSensitive) {
    args.push('--case-sensitive')
  }

  if (options.mode === 'literal') {
    args.push('--fixed-strings')
  }

  if (options.wholeWord) {
    args.push('--word-regexp')
  }

  if (extension) {
    args.push('--glob', `*${extension}`)
  }

  args.push('--regexp', options.query)

  return new Promise((resolve, reject) => {
    const child = spawn('rg', args, {
      cwd: source.rootPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const results: SearchMatch[] = []
    let stdout = ''
    let stderr = ''
    let didAbort = false

    const onAbort = () => {
      didAbort = true
      child.kill()
      resolve([])
    }

    signal?.addEventListener('abort', onAbort)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
      const lines = stdout.split('\n')
      stdout = lines.pop() ?? ''

      for (const line of lines) {
        const event = parseJsonLine(line)
        if (!event) {
          continue
        }

        const relativePath = event.data.path.text
        const normalizedRelative = relativePath.split('/').join(path.sep)
        const lowerRelative = normalizedRelative.toLowerCase()

        if (pathFilter && !lowerRelative.includes(pathFilter)) {
          continue
        }

        results.push({
          sourceId: source.id,
          sourceLabel: source.label,
          sourceKind: source.kind,
          absolutePath: path.join(source.rootPath, normalizedRelative),
          relativePath: normalizedRelative,
          lineNumber: event.data.line_number,
          lineText: event.data.lines.text.replace(/\n$/, ''),
          matchRanges: event.data.submatches.map((submatch) => ({
            start: submatch.start,
            end: submatch.end,
          })),
          projectName: projectNameFor(source, normalizedRelative),
        })
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
        return
      }

      if (code === 0 || code === 1) {
        resolve(results)
        return
      }

      reject(new Error(stderr || `ripgrep exited with code ${code}`))
    })
  })
}

export async function searchAcrossSources(
  sources: SearchSource[],
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchMatch[]> {
  const query = options.query.trim()

  if (!query) {
    return []
  }

  const narrowed = options.sourceFilter
    ? sources.filter((source) => source.id === options.sourceFilter)
    : sources

  const all = await Promise.all(
    narrowed.map((source) => runRipgrep(source, options, signal)),
  )

  return all
    .flat()
    .sort((left, right) => left.sourceLabel.localeCompare(right.sourceLabel))
}

export function groupMatchesByProject(matches: SearchMatch[]): Array<{
  sourceId: string
  sourceLabel: string
  projectName: string
  sourceKind: 'local' | 'github'
  matches: SearchMatch[]
}> {
  const grouped = new Map<
    string,
    {
      sourceId: string
      sourceLabel: string
      projectName: string
      sourceKind: 'local' | 'github'
      matches: SearchMatch[]
    }
  >()

  for (const match of matches) {
    const key = `${match.sourceId}:${match.projectName}`

    const current = grouped.get(key)

    if (current) {
      current.matches.push(match)
      continue
    }

    grouped.set(key, {
      sourceId: match.sourceId,
      sourceLabel: match.sourceLabel,
      projectName: match.projectName,
      sourceKind: match.sourceKind,
      matches: [match],
    })
  }

  return [...grouped.values()].sort((left, right) =>
    `${left.sourceLabel}/${left.projectName}`.localeCompare(
      `${right.sourceLabel}/${right.projectName}`,
    ),
  )
}
