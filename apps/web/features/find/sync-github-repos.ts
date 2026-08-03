import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { FIND_MIRROR_ROOT } from '@/features/find/config/data'
import type { GitHubRepoSource } from '@/features/find/config/schemas'
import {
  readFindConfig,
  updateFindConfig,
} from '@/features/find/config/service'
import type { SyncResult } from '@/features/find/schemas'
import {
  SYNC_CONCURRENCY,
  type SyncGitHubReposMode,
  selectReposToSync,
} from '@/features/find/sync-eligibility'
import { runGit } from '@/lib/git'

function nowIso(): string {
  return new Date().toISOString()
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []

  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      const item = items[index]
      if (item === undefined) continue
      results[index] = await fn(item)
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

async function syncOneGitHubRepo(repo: GitHubRepoSource): Promise<SyncResult> {
  const destination = path.join(FIND_MIRROR_ROOT, repo.owner, repo.repo)
  const parent = path.dirname(destination)
  const repoUrl = `https://github.com/${repo.owner}/${repo.repo}.git`
  await mkdir(parent, { recursive: true })

  const cloneResult = await runGit([
    'clone',
    '--depth',
    '1',
    repoUrl,
    destination,
  ])

  if (!cloneResult.ok && !cloneResult.error?.includes('already exists')) {
    const message = cloneResult.error ?? 'Clone failed'
    await updateFindConfig((current) => ({
      ...current,
      githubRepos: current.githubRepos.map((item) =>
        item.id === repo.id ? { ...item, syncError: message } : item,
      ),
    }))
    return { id: repo.id, ok: false, message }
  }

  const fetchResult = await runGit(
    ['fetch', '--depth', '1', 'origin', 'HEAD'],
    destination,
  )

  if (!fetchResult.ok) {
    const message = fetchResult.error ?? 'Fetch failed'
    await updateFindConfig((current) => ({
      ...current,
      githubRepos: current.githubRepos.map((item) =>
        item.id === repo.id ? { ...item, syncError: message } : item,
      ),
    }))
    return { id: repo.id, ok: false, message }
  }

  const resetResult = await runGit(
    ['checkout', '--detach', '--force', 'FETCH_HEAD'],
    destination,
  )

  if (!resetResult.ok) {
    const message = resetResult.error ?? 'Reset failed'
    await updateFindConfig((current) => ({
      ...current,
      githubRepos: current.githubRepos.map((item) =>
        item.id === repo.id ? { ...item, syncError: message } : item,
      ),
    }))
    return { id: repo.id, ok: false, message }
  }

  await updateFindConfig((current) => ({
    ...current,
    githubRepos: current.githubRepos.map((item) =>
      item.id === repo.id
        ? { ...item, syncedAt: nowIso(), syncError: null }
        : item,
    ),
  }))

  return { id: repo.id, ok: true, message: 'Synced' }
}

export async function syncGitHubRepos(input: {
  mode: SyncGitHubReposMode
  ids?: string[]
}): Promise<SyncResult[]> {
  const config = await readFindConfig()
  const targets = selectReposToSync(config.githubRepos, input.mode, input.ids)

  return mapPool(targets, SYNC_CONCURRENCY, syncOneGitHubRepo)
}
