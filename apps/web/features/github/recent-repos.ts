import { z } from 'zod'
import { resilientArray } from '@/lib/schemas'

export const MAX_RECENT_REPOS = 8
export const RECENT_REPOS_STORAGE_KEY = 'crispy-code:git:recent-repos'

const recentRepoEntrySchema = z.string().regex(/^[\w.-]+\/[\w.-]+$/)

const recentReposSchema = resilientArray(recentRepoEntrySchema).transform(
  (items) => items.slice(0, MAX_RECENT_REPOS),
)

export function addRecentRepo(
  existing: string[],
  owner: string,
  repo: string,
): string[] {
  const entry = `${owner}/${repo}`
  return [entry, ...existing.filter((value) => value !== entry)].slice(
    0,
    MAX_RECENT_REPOS,
  )
}

function parseStoredRepos(raw: string | null): string[] {
  if (raw == null) {
    return []
  }

  try {
    return recentReposSchema.parse(JSON.parse(raw))
  } catch {
    return []
  }
}

export function readRecentRepos(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    return parseStoredRepos(localStorage.getItem(RECENT_REPOS_STORAGE_KEY))
  } catch {
    return []
  }
}

export function writeRecentRepos(list: string[]): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(
      RECENT_REPOS_STORAGE_KEY,
      JSON.stringify(list.slice(0, MAX_RECENT_REPOS)),
    )
  } catch {
    // Quota / private mode — Connect must still work.
  }
}

export function rememberRecentRepo(owner: string, repo: string): void {
  writeRecentRepos(addRecentRepo(readRecentRepos(), owner, repo))
}
