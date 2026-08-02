'use server'

import { spawn } from 'node:child_process'
import { access, constants, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import {
  createSourceId,
  FIND_MIRROR_ROOT,
  type GitHubRepoSource,
  normalizeLocalPath,
  readFindConfig,
  updateFindConfig,
} from '@/lib/find/config'
import type { SearchOptions } from '@/lib/find/search'
import { executeSearch, type SearchResponse } from '@/lib/find/search-service'
import { fetchGitHub } from '@/lib/github/client'

type GitHubRepoLookupItem = {
  full_name: string
  name: string
  owner: {
    login: string
  }
}

export type SourceActionState = {
  error?: string
  success?: string
}

export type GitHubRepoPick = {
  id: string
  owner: string
  repo: string
  selected: boolean
}

export type GitHubLookupResult =
  | {
      status: 'ok'
      repos: GitHubRepoPick[]
    }
  | {
      status: 'not-found' | 'error' | 'rate-limited'
      message?: string
      resetAt?: string | null
    }

export type SyncResult = {
  id: string
  ok: boolean
  message: string
}

export type { SearchResponse } from '@/lib/find/search-service'

function nowIso(): string {
  return new Date().toISOString()
}

async function ensureReadableDirectory(inputPath: string): Promise<void> {
  await access(inputPath, constants.R_OK)
}

async function runGit(
  args: string[],
  cwd?: string,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd })
    let stderr = ''

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (error) => {
      resolve({ ok: false, error: error.message })
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true })
        return
      }

      resolve({
        ok: false,
        error: stderr.trim() || `git exited with code ${code}`,
      })
    })
  })
}

// function syncStatusMessage(repo: GitHubRepoSource): string {
//   if (repo.syncError) {
//     return `Failed: ${repo.syncError}`
//   }

//   if (repo.syncedAt) {
//     return `Synced ${new Date(repo.syncedAt).toLocaleString()}`
//   }

//   return 'Not yet synced'
// }

export async function addLocalRoot(
  _state: SourceActionState,
  formData: FormData,
): Promise<SourceActionState> {
  const rawPath = String(formData.get('localPath') ?? '').trim()

  if (!rawPath) {
    return { error: 'Enter a local project folder.' }
  }

  const normalized = normalizeLocalPath(rawPath)
  const absolute = path.resolve(normalized)

  try {
    await ensureReadableDirectory(absolute)
  } catch {
    return {
      error: 'That folder cannot be read. Check the path and try again.',
    }
  }

  await updateFindConfig((current) => {
    if (current.localRoots.some((item) => item.path === absolute)) {
      return current
    }

    return {
      ...current,
      localRoots: [
        ...current.localRoots,
        { id: absolute.toLowerCase(), path: absolute, addedAt: nowIso() },
      ],
    }
  })

  revalidatePath('/find')
  return { success: 'Added local source.' }
}

export async function removeLocalRoot(id: string): Promise<void> {
  await updateFindConfig((current) => ({
    ...current,
    localRoots: current.localRoots.filter((item) => item.id !== id),
  }))
  revalidatePath('/find')
}

export async function lookupGitHubRepos(
  ownerOrOrg: string,
): Promise<GitHubLookupResult> {
  const target = ownerOrOrg.trim()

  if (!target) {
    return { status: 'error', message: 'Enter a GitHub username or org.' }
  }

  const userResult = await fetchGitHub<GitHubRepoLookupItem[]>(
    `/users/${encodeURIComponent(target)}/repos?per_page=100&sort=updated`,
  )

  const mapRepos = async (
    items: GitHubRepoLookupItem[],
  ): Promise<GitHubLookupResult> => {
    const config = await readFindConfig()
    const selected = new Set(config.githubRepos.map((repo) => repo.id))
    const repos = items.map((repo) => {
      const id = createSourceId(repo.owner.login, repo.name)
      return {
        id,
        owner: repo.owner.login,
        repo: repo.name,
        selected: selected.has(id),
      }
    })

    return { status: 'ok', repos }
  }

  if (userResult.status === 'ok') {
    return mapRepos(userResult.data)
  }

  if (userResult.status === 'rate-limited') {
    return {
      status: 'rate-limited',
      resetAt: userResult.resetAt?.toISOString() ?? null,
    }
  }

  const orgResult = await fetchGitHub<GitHubRepoLookupItem[]>(
    `/orgs/${encodeURIComponent(target)}/repos?per_page=100&sort=updated`,
  )

  if (orgResult.status === 'ok') {
    return mapRepos(orgResult.data)
  }

  if (orgResult.status === 'rate-limited') {
    return {
      status: 'rate-limited',
      resetAt: orgResult.resetAt?.toISOString() ?? null,
    }
  }

  if (orgResult.status === 'not-found') {
    return { status: 'not-found', message: 'User or org not found.' }
  }

  return {
    status: 'error',
    message:
      orgResult.status === 'error'
        ? orgResult.message
        : 'Unable to load repositories right now.',
  }
}

export async function setGitHubRepoSelection(
  repo: Pick<GitHubRepoSource, 'owner' | 'repo' | 'id'>,
  selected: boolean,
): Promise<void> {
  await updateFindConfig((current) => {
    const existing = current.githubRepos.find((item) => item.id === repo.id)

    if (selected) {
      if (existing) {
        return current
      }

      return {
        ...current,
        githubRepos: [
          ...current.githubRepos,
          {
            id: repo.id,
            owner: repo.owner,
            repo: repo.repo,
            selectedAt: nowIso(),
            syncedAt: null,
            syncError: null,
          },
        ],
      }
    }

    return {
      ...current,
      githubRepos: current.githubRepos.filter((item) => item.id !== repo.id),
    }
  })

  revalidatePath('/find')
}

export async function syncSelectedGitHubRepos(): Promise<SyncResult[]> {
  const config = await readFindConfig()
  const results: SyncResult[] = []

  for (const repo of config.githubRepos) {
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
      await updateFindConfig((current) => ({
        ...current,
        githubRepos: current.githubRepos.map((item) =>
          item.id === repo.id
            ? { ...item, syncError: cloneResult.error ?? 'Clone failed' }
            : item,
        ),
      }))

      results.push({
        id: repo.id,
        ok: false,
        message: cloneResult.error ?? 'Clone failed',
      })
      continue
    }

    const fetchResult = await runGit(
      ['fetch', '--depth', '1', 'origin', 'HEAD'],
      destination,
    )

    if (!fetchResult.ok) {
      await updateFindConfig((current) => ({
        ...current,
        githubRepos: current.githubRepos.map((item) =>
          item.id === repo.id
            ? { ...item, syncError: fetchResult.error ?? 'Fetch failed' }
            : item,
        ),
      }))

      results.push({
        id: repo.id,
        ok: false,
        message: fetchResult.error ?? 'Fetch failed',
      })
      continue
    }

    const resetResult = await runGit(
      ['checkout', '--detach', '--force', 'FETCH_HEAD'],
      destination,
    )

    if (!resetResult.ok) {
      await updateFindConfig((current) => ({
        ...current,
        githubRepos: current.githubRepos.map((item) =>
          item.id === repo.id
            ? { ...item, syncError: resetResult.error ?? 'Reset failed' }
            : item,
        ),
      }))

      results.push({
        id: repo.id,
        ok: false,
        message: resetResult.error ?? 'Reset failed',
      })
      continue
    }

    await updateFindConfig((current) => ({
      ...current,
      githubRepos: current.githubRepos.map((item) =>
        item.id === repo.id
          ? { ...item, syncedAt: nowIso(), syncError: null }
          : item,
      ),
    }))

    results.push({
      id: repo.id,
      ok: true,
      message: 'Synced',
    })
  }

  revalidatePath('/find')
  return results
}

export async function searchCode(
  options: SearchOptions,
): Promise<SearchResponse> {
  return executeSearch(options)
}

// export function formatRepoSyncStatus(config: FindConfig): Record<string, string> {
//   return Object.fromEntries(
//     config.githubRepos.map((repo) => [repo.id, syncStatusMessage(repo)]),
//   )
// }
