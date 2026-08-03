'use client'

import { isDefinedError } from '@orpc/client'
import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { Field, FieldError, FieldLabel } from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCwIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { useSyncGitHubRepos } from '@/components/find/use-sync-github-repos'
import type { FindConfig } from '@/features/find/config/schemas'
import type { GitHubRepoPick } from '@/features/find/schemas'
import { orpc } from '@/lib/orpc/client'

const emptyConfig: FindConfig = {
  localRoots: [],
  githubRepos: [],
}

function formatSyncedAt(syncedAt: string | null) {
  if (!syncedAt) return 'Not synced yet'
  const date = new Date(syncedAt)
  if (Number.isNaN(date.getTime())) return 'Not synced yet'
  return `Last synced ${date.toLocaleString()}`
}

export function GitHubSourcesPanel() {
  const queryClient = useQueryClient()
  const { sync, isPending: syncPending } = useSyncGitHubRepos()

  const configQuery = useQuery(orpc.find.getConfig.queryOptions())
  const config = configQuery.data ?? emptyConfig

  const [repoOwner, setRepoOwner] = useState('')
  const [repoLookupError, setRepoLookupError] = useState<string | null>(null)
  const [repoResults, setRepoResults] = useState<GitHubRepoPick[]>([])

  const repoLookupMutation = useMutation(
    orpc.find.lookupGitHubRepos.mutationOptions({
      onSuccess: (result) => {
        setRepoLookupError(null)
        setRepoResults(result.repos)
      },
      onError: (error) => {
        setRepoResults([])
        if (isDefinedError(error)) {
          if (error.code === 'RATE_LIMITED') {
            setRepoLookupError(
              error.data.resetAt
                ? `Rate limited until ${new Date(error.data.resetAt).toLocaleTimeString()}.`
                : 'Rate limited by GitHub. Try again soon.',
            )
            return
          }
          setRepoLookupError(error.message || 'Could not load repositories.')
          return
        }
        setRepoLookupError(
          error instanceof Error
            ? error.message
            : 'Could not load repositories.',
        )
      },
    }),
  )

  const repoSelectionMutation = useMutation(
    orpc.find.setGitHubRepoSelection.mutationOptions({
      onSuccess: async (_data, { repo, selected }) => {
        setRepoResults((current) =>
          current.map((item) =>
            item.id === repo.id ? { ...item, selected } : item,
          ),
        )
        await queryClient.invalidateQueries({
          queryKey: orpc.find.getConfig.key(),
        })
        if (selected) {
          sync({ mode: 'force', ids: [repo.id] })
        }
      },
    }),
  )

  const removeMutation = useMutation(
    orpc.find.removeGitHubRepo.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.find.getConfig.key(),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.find.search.key(),
        })
      },
    }),
  )

  const busy = repoSelectionMutation.isPending || removeMutation.isPending

  return (
    <div className='grid gap-6'>
      <div className='grid gap-3'>
        <Field>
          <FieldLabel htmlFor='githubOwner'>GitHub user or org</FieldLabel>
          <Input
            id='githubOwner'
            value={repoOwner}
            onChange={(event) => setRepoOwner(event.target.value)}
            placeholder='vercel'
            autoCapitalize='none'
            spellCheck={false}
          />
        </Field>
        <Button
          type='button'
          disabled={repoLookupMutation.isPending}
          onClick={() => {
            setRepoLookupError(null)
            repoLookupMutation.mutate({ ownerOrOrg: repoOwner })
          }}
        >
          {repoLookupMutation.isPending
            ? 'Loading repos...'
            : 'Load repositories'}
        </Button>
        {repoLookupError ? <FieldError>{repoLookupError}</FieldError> : null}

        {repoResults.length ? (
          <div className='grid gap-2 max-h-64 overflow-auto rounded-md border p-2'>
            {repoResults.map((repo) => (
              <label
                key={repo.id}
                className='flex items-center justify-between gap-3 rounded-sm px-2 py-1.5 hover:bg-muted'
              >
                <span className='text-sm font-mono'>
                  {repo.owner}/{repo.repo}
                </span>
                <input
                  type='checkbox'
                  checked={repo.selected}
                  disabled={busy}
                  onChange={(event) =>
                    repoSelectionMutation.mutate({
                      repo: {
                        id: repo.id,
                        owner: repo.owner,
                        repo: repo.repo,
                      },
                      selected: event.target.checked,
                    })
                  }
                />
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {config.githubRepos.length ? (
        <div className='grid gap-2'>
          <p className='text-sm font-medium'>Selected repositories</p>
          {config.githubRepos.map((repo) => (
            <div
              key={repo.id}
              className='flex items-start justify-between gap-3 rounded-md border p-3'
            >
              <div className='min-w-0'>
                <p className='font-mono text-xs'>
                  {repo.owner}/{repo.repo}
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  {repo.syncError
                    ? `Failed: ${repo.syncError}`
                    : formatSyncedAt(repo.syncedAt)}
                </p>
              </div>
              <div className='flex items-center gap-1'>
                {repo.syncError ? (
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    disabled={syncPending || busy}
                    onClick={() => sync({ mode: 'force', ids: [repo.id] })}
                  >
                    <RefreshCwIcon />
                    <span className='sr-only'>
                      Retry sync {repo.owner}/{repo.repo}
                    </span>
                  </Button>
                ) : null}
                <Button
                  variant='ghost'
                  size='icon-sm'
                  disabled={busy}
                  onClick={() => removeMutation.mutate({ id: repo.id })}
                >
                  <Trash2Icon />
                  <span className='sr-only'>
                    Remove {repo.owner}/{repo.repo}
                  </span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No GitHub repos selected yet</EmptyTitle>
            <EmptyDescription>
              Load a user or org and check the repositories you want to include.
              They sync automatically when selected.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
