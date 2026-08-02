'use server'

import { access, constants, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import {
  createSourceId,
  FIND_MIRROR_ROOT,
  type FindConfig,
  type GitHubRepoSource,
  normalizeLocalPath,
  readFindConfig,
  updateFindConfig,
} from '@/lib/find/config'
import { runGit } from '@/lib/git'
import { fetchGitHub } from '@/lib/github/client'
import { gitHubRepoLookupListSchema } from '@/lib/github/schemas'
import type { GitHubRepoLookupItem } from '@/lib/github/types'

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

const addLocalRootFields = z.object({
  localPath: z.string().trim().min(1),
})

const sourceIdSchema = z.string().min(1)

const repoSelectionSchema = z.object({
  repo: z.object({
    id: z.string().min(1),
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  selected: z.boolean(),
})

const ownerOrOrgSchema = z.string().trim().min(1)

function nowIso(): string {
  return new Date().toISOString()
}

async function ensureReadableDirectory(inputPath: string): Promise<void> {
  await access(inputPath, constants.R_OK)
}

export async function addLocalRoot(
  formData: FormData,
): Promise<SourceActionState> {
  const fields = addLocalRootFields.safeParse({
    localPath: formData.get('localPath'),
  })

  if (!fields.success) {
    return { error: 'Enter a local project folder.' }
  }

  const normalized = normalizeLocalPath(fields.data.localPath)
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

  return { success: 'Added local source.' }
}

export async function removeLocalRoot(id: string): Promise<void> {
  const parsedId = sourceIdSchema.parse(id)

  await updateFindConfig((current) => ({
    ...current,
    localRoots: current.localRoots.filter((item) => item.id !== parsedId),
  }))
}

export async function lookupGitHubRepos(
  ownerOrOrg: string,
): Promise<GitHubLookupResult> {
  const parsedTarget = ownerOrOrgSchema.safeParse(ownerOrOrg)

  if (!parsedTarget.success) {
    return { status: 'error', message: 'Enter a GitHub username or org.' }
  }

  const target = parsedTarget.data

  const userResult = await fetchGitHub(
    `/users/${encodeURIComponent(target)}/repos?per_page=100&sort=updated`,
    gitHubRepoLookupListSchema,
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

  const orgResult = await fetchGitHub(
    `/orgs/${encodeURIComponent(target)}/repos?per_page=100&sort=updated`,
    gitHubRepoLookupListSchema,
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
  repoInput: Pick<GitHubRepoSource, 'owner' | 'repo' | 'id'>,
  selectedInput: boolean,
): Promise<void> {
  const { repo, selected } = repoSelectionSchema.parse({
    repo: repoInput,
    selected: selectedInput,
  })

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

  return results
}

export async function getFindConfig(): Promise<FindConfig> {
  return readFindConfig()
}
