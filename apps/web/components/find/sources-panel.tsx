'use client'

import { isDefinedError } from '@orpc/client'
import { Button } from '@repo/ui/components/button'
import { Field, FieldError, FieldLabel } from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import type { FindConfig } from '@/features/find/config/schemas'
import type { GitHubRepoPick } from '@/features/find/schemas'
import { orpc } from '@/lib/orpc/client'

const emptyConfig: FindConfig = {
  localRoots: [],
  githubRepos: [],
  recentSearches: [],
}

export function SourcesPanel() {
  const queryClient = useQueryClient()

  const configQuery = useQuery(orpc.find.getConfig.queryOptions())

  const addLocalRootMutation = useMutation(
    orpc.find.addLocalRoot.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.find.getConfig.key(),
        })
      },
    }),
  )

  const removeLocalRootMutation = useMutation(
    orpc.find.removeLocalRoot.mutationOptions({
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
      },
    }),
  )

  const config = configQuery.data ?? emptyConfig
  const [repoOwner, setRepoOwner] = useState('')
  const [repoLookupError, setRepoLookupError] = useState<string | null>(null)
  const [repoResults, setRepoResults] = useState<GitHubRepoPick[]>([])

  const addLocalRootError = addLocalRootMutation.isError
    ? isDefinedError(addLocalRootMutation.error)
      ? addLocalRootMutation.error.message
      : addLocalRootMutation.error instanceof Error
        ? addLocalRootMutation.error.message
        : 'Enter a local project folder.'
    : null

  return (
    <div className='grid gap-6'>
      {configQuery.isError ? (
        <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs'>
          Failed to load your sources: {configQuery.error.message}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          const form = event.currentTarget
          const formData = new FormData(form)
          const localPath = String(formData.get('localPath') ?? '')
          addLocalRootMutation.mutate(
            { localPath },
            {
              onSuccess: () => {
                form.reset()
              },
            },
          )
        }}
        className='grid gap-3'
      >
        <Field>
          <FieldLabel htmlFor='localPath'>Add local folder</FieldLabel>
          <Input
            id='localPath'
            name='localPath'
            placeholder='~/Projects'
            required
            autoComplete='off'
          />
          {addLocalRootError ? (
            <FieldError>{addLocalRootError}</FieldError>
          ) : null}
        </Field>
        <Button type='submit' disabled={addLocalRootMutation.isPending}>
          {addLocalRootMutation.isPending ? 'Adding...' : 'Add local source'}
        </Button>
      </form>

      {config.localRoots.length ? (
        <div className='grid gap-2'>
          {config.localRoots.map((root) => (
            <div
              key={root.id}
              className='flex items-center justify-between rounded-md border bg-card px-3 py-2'
            >
              <p className='font-mono text-xs break-all'>{root.path}</p>
              <Button
                variant='ghost'
                size='icon-sm'
                disabled={removeLocalRootMutation.isPending}
                onClick={() => removeLocalRootMutation.mutate({ id: root.id })}
              >
                <Trash2Icon />
                <span className='sr-only'>Remove local source</span>
              </Button>
            </div>
          ))}
        </div>
      ) : null}

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
                  disabled={repoSelectionMutation.isPending}
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
    </div>
  )
}
