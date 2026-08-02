import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export type GitHubRepoSource = {
  id: string
  owner: string
  repo: string
  selectedAt: string
  syncError: string | null
  syncedAt: string | null
}

export type LocalRootSource = {
  id: string
  path: string
  addedAt: string
}

export type FindConfig = {
  localRoots: LocalRootSource[]
  githubRepos: GitHubRepoSource[]
  recentSearches: string[]
}

export const FIND_HOME = path.join(os.homedir(), '.crispy-code')
export const FIND_CONFIG_PATH = path.join(FIND_HOME, 'config.json')
export const FIND_MIRROR_ROOT = path.join(FIND_HOME, 'repos')

const MAX_RECENT_SEARCHES = 8

function normalizeConfig(input: unknown): FindConfig {
  const empty: FindConfig = {
    localRoots: [],
    githubRepos: [],
    recentSearches: [],
  }

  if (!input || typeof input !== 'object') {
    return empty
  }

  const value = input as Partial<FindConfig>

  const localRoots =
    value.localRoots?.filter((item): item is LocalRootSource => {
      return Boolean(
        item &&
          typeof item.id === 'string' &&
          typeof item.path === 'string' &&
          typeof item.addedAt === 'string',
      )
    }) ?? []

  const githubRepos =
    value.githubRepos?.filter((item): item is GitHubRepoSource => {
      return Boolean(
        item &&
          typeof item.id === 'string' &&
          typeof item.owner === 'string' &&
          typeof item.repo === 'string' &&
          typeof item.selectedAt === 'string' &&
          (typeof item.syncedAt === 'string' || item.syncedAt === null) &&
          (typeof item.syncError === 'string' || item.syncError === null),
      )
    }) ?? []

  const recentSearches = (value.recentSearches ?? [])
    .filter((item): item is string => typeof item === 'string')
    .slice(0, MAX_RECENT_SEARCHES)

  return {
    localRoots,
    githubRepos,
    recentSearches,
  }
}

async function ensureFindHome(): Promise<void> {
  await mkdir(FIND_HOME, { recursive: true })
}

export async function readFindConfig(): Promise<FindConfig> {
  try {
    const raw = await readFile(FIND_CONFIG_PATH, 'utf8')
    return normalizeConfig(JSON.parse(raw))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        localRoots: [],
        githubRepos: [],
        recentSearches: [],
      }
    }

    throw error
  }
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
  const current = await readFindConfig()
  const next = normalizeConfig(update(current))
  await writeFindConfig(next)
  return next
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
