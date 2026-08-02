import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import { formatIssues } from '@/lib/validation'

const MAX_RECENT_SEARCHES = 8

const gitHubRepoSourceSchema = z.object({
  id: z.string(),
  owner: z.string(),
  repo: z.string(),
  selectedAt: z.string(),
  syncError: z.string().nullable(),
  syncedAt: z.string().nullable(),
})

const localRootSourceSchema = z.object({
  id: z.string(),
  path: z.string(),
  addedAt: z.string(),
})

const resilientArray = <T extends z.ZodType>(item: T) =>
  z
    .array(z.unknown())
    .transform((items) =>
      items.flatMap((value) => {
        const result = item.safeParse(value)
        return result.success ? [result.data] : []
      }),
    )
    .catch([])

export const findConfigSchema = z.object({
  localRoots: resilientArray(localRootSourceSchema),
  githubRepos: resilientArray(gitHubRepoSourceSchema),
  recentSearches: resilientArray(z.string()).transform((items) =>
    items.slice(0, MAX_RECENT_SEARCHES),
  ),
})

export type FindConfig = z.infer<typeof findConfigSchema>
export type GitHubRepoSource = z.infer<typeof gitHubRepoSourceSchema>
export type LocalRootSource = z.infer<typeof localRootSourceSchema>

export const FIND_HOME = path.join(os.homedir(), '.crispy-code')
export const FIND_CONFIG_PATH = path.join(FIND_HOME, 'config.json')
export const FIND_MIRROR_ROOT = path.join(FIND_HOME, 'repos')

let updateQueue: Promise<unknown> = Promise.resolve()

function emptyFindConfig(): FindConfig {
  return { localRoots: [], githubRepos: [], recentSearches: [] }
}

async function ensureFindHome(): Promise<void> {
  await mkdir(FIND_HOME, { recursive: true })
}

export async function readFindConfig(): Promise<FindConfig> {
  let raw: string

  try {
    raw = await readFile(FIND_CONFIG_PATH, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return emptyFindConfig()
    }

    throw error
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn(
      `Ignoring unparseable find config at ${FIND_CONFIG_PATH}; using defaults.`,
    )
    return emptyFindConfig()
  }

  const result = findConfigSchema.safeParse(parsed)

  if (!result.success) {
    console.warn(
      `Ignoring invalid find config at ${FIND_CONFIG_PATH}: ${formatIssues(result.error)}`,
    )
    return emptyFindConfig()
  }

  return result.data
}

export async function writeFindConfig(config: FindConfig): Promise<void> {
  await ensureFindHome()
  await writeFile(
    FIND_CONFIG_PATH,
    `${JSON.stringify(config, null, 2)}\n`,
    'utf8',
  )
}

export async function updateFindConfig(
  update: (current: FindConfig) => FindConfig,
): Promise<FindConfig> {
  const task = updateQueue.then(async () => {
    const current = await readFindConfig()
    const next = findConfigSchema.parse(update(current))
    await writeFindConfig(next)
    return next
  })
  updateQueue = task.catch(() => undefined)
  return task
}

export function createSourceId(owner: string, repo: string): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`
}

export function normalizeLocalPath(raw: string): string {
  if (raw.startsWith('~/')) {
    return path.join(os.homedir(), raw.slice(2))
  }

  return raw
}

export function addRecentSearches(existing: string[], query: string): string[] {
  const trimmed = query.trim()

  if (!trimmed) {
    return existing
  }

  return [trimmed, ...existing.filter((value) => value !== trimmed)].slice(
    0,
    MAX_RECENT_SEARCHES,
  )
}
