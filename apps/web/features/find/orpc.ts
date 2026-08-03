import path from 'node:path'
import { z } from 'zod'
import {
  findConfigSchema,
  type GitHubRepoSource,
} from '@/features/find/config/schemas'
import {
  readFindConfig,
  updateFindConfig,
} from '@/features/find/config/service'
import { removeGitHubRepoFromConfigAndDisk } from '@/features/find/remove-github-repo'
import {
  gitHubLookupOutputSchema,
  searchResponseSchema,
  searchRpcInputSchema,
  syncGitHubReposInputSchema,
  syncResultSchema,
} from '@/features/find/schemas'
import { executeSearch } from '@/features/find/service'
import { syncGitHubRepos } from '@/features/find/sync-github-repos'
import { createSourceId } from '@/features/find/utils'
import { fetchGitHub } from '@/features/github/client'
import { gitHubRepoLookupListSchema } from '@/features/github/schemas'
import type { GitHubRepoLookupItem } from '@/features/github/types'
import { isReadableDir, normalizeLocalPath } from '@/lib/fs'
import { base } from '@/lib/orpc/base'

function nowIso(): string {
  return new Date().toISOString()
}

export const findRouter = {
  getConfig: base
    .output(findConfigSchema)
    .handler(async () => readFindConfig()),
  search: base
    .input(searchRpcInputSchema)
    .output(searchResponseSchema)
    .handler(async ({ input, signal }) =>
      executeSearch({ ...input, maxResultsPerSource: 50 }, signal),
    ),
  addLocalRoot: base
    .input(
      z.object({
        localPath: z.string().trim().min(1),
      }),
    )
    .output(z.object({ success: z.string() }))
    .handler(async ({ input, errors }) => {
      const normalized = normalizeLocalPath(input.localPath)
      const absolute = path.resolve(normalized)

      if (!(await isReadableDir(absolute))) {
        throw errors.BAD_REQUEST({
          message: 'That folder cannot be read. Check the path and try again.',
        })
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
    }),
  removeLocalRoot: base
    .input(z.object({ id: z.string().min(1) }))
    .output(z.void())
    .handler(async ({ input }) => {
      await updateFindConfig((current) => ({
        ...current,
        localRoots: current.localRoots.filter((item) => item.id !== input.id),
      }))
    }),
  lookupGitHubRepos: base
    .input(z.object({ ownerOrOrg: z.string().trim().min(1) }))
    .output(gitHubLookupOutputSchema)
    .handler(async ({ input, errors }) => {
      const target = input.ownerOrOrg

      const userResult = await fetchGitHub(
        `/users/${encodeURIComponent(target)}/repos?per_page=100&sort=updated`,
        gitHubRepoLookupListSchema,
      )

      const mapRepos = async (items: GitHubRepoLookupItem[]) => {
        const config = await readFindConfig()
        const selected = new Set(config.githubRepos.map((repo) => repo.id))
        return {
          repos: items.map((repo) => {
            const id = createSourceId(repo.owner.login, repo.name)
            return {
              id,
              owner: repo.owner.login,
              repo: repo.name,
              selected: selected.has(id),
            }
          }),
        }
      }

      if (userResult.status === 'ok') {
        return mapRepos(userResult.data)
      }

      if (userResult.status === 'rate-limited') {
        throw errors.RATE_LIMITED({
          message: 'Rate limited by GitHub. Try again soon.',
          data: {
            resetAt: userResult.resetAt?.toISOString() ?? null,
          },
        })
      }

      const orgResult = await fetchGitHub(
        `/orgs/${encodeURIComponent(target)}/repos?per_page=100&sort=updated`,
        gitHubRepoLookupListSchema,
      )

      if (orgResult.status === 'ok') {
        return mapRepos(orgResult.data)
      }

      if (orgResult.status === 'rate-limited') {
        throw errors.RATE_LIMITED({
          message: 'Rate limited by GitHub. Try again soon.',
          data: {
            resetAt: orgResult.resetAt?.toISOString() ?? null,
          },
        })
      }

      if (orgResult.status === 'not-found') {
        throw errors.NOT_FOUND({
          message: 'User or org not found.',
        })
      }

      throw errors.BAD_REQUEST({
        message:
          orgResult.status === 'error'
            ? orgResult.message
            : 'Unable to load repositories right now.',
      })
    }),
  setGitHubRepoSelection: base
    .input(
      z.object({
        repo: z.object({
          id: z.string().min(1),
          owner: z.string().min(1),
          repo: z.string().min(1),
        }),
        selected: z.boolean(),
      }),
    )
    .output(z.void())
    .handler(async ({ input, errors }) => {
      const { repo, selected } = input

      if (!selected) {
        try {
          await removeGitHubRepoFromConfigAndDisk({
            id: repo.id,
            owner: repo.owner,
            repo: repo.repo,
          })
        } catch (error) {
          throw errors.BAD_REQUEST({
            message:
              error instanceof Error
                ? error.message
                : 'Could not remove repository.',
          })
        }
        return
      }

      await updateFindConfig((current) => {
        const existing = current.githubRepos.find((item) => item.id === repo.id)

        if (existing) {
          return current
        }

        const next: GitHubRepoSource = {
          id: repo.id,
          owner: repo.owner,
          repo: repo.repo,
          selectedAt: nowIso(),
          syncedAt: null,
          syncError: null,
        }

        return {
          ...current,
          githubRepos: [...current.githubRepos, next],
        }
      })
    }),
  removeGitHubRepo: base
    .input(z.object({ id: z.string().min(1) }))
    .output(z.void())
    .handler(async ({ input, errors }) => {
      try {
        await removeGitHubRepoFromConfigAndDisk({ id: input.id })
      } catch (error) {
        throw errors.BAD_REQUEST({
          message:
            error instanceof Error
              ? error.message
              : 'Could not remove repository.',
        })
      }
    }),
  syncGitHubRepos: base
    .input(syncGitHubReposInputSchema)
    .output(z.array(syncResultSchema))
    .handler(async ({ input }) => syncGitHubRepos(input)),
}
