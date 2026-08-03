import type { GitHubRepoSource } from '@/features/find/config/schemas'

export const SYNC_STALE_MS = 60 * 60 * 1000
export const SYNC_CONCURRENCY = 4

export type SyncGitHubReposMode = 'stale' | 'force'

export function isEligibleForStaleSync(
  repo: GitHubRepoSource,
  now = Date.now(),
): boolean {
  if (repo.syncError) return false
  if (repo.syncedAt == null) return true
  const syncedAtMs = Date.parse(repo.syncedAt)
  if (Number.isNaN(syncedAtMs)) return true
  return now - syncedAtMs >= SYNC_STALE_MS
}

export function selectReposToSync(
  repos: GitHubRepoSource[],
  mode: SyncGitHubReposMode,
  ids?: string[],
): GitHubRepoSource[] {
  const scoped = ids?.length
    ? repos.filter((repo) => ids.includes(repo.id))
    : repos

  if (mode === 'force') return scoped

  return scoped.filter((repo) => isEligibleForStaleSync(repo))
}
