'use client'

import { useMutationState, useQuery } from '@tanstack/react-query'
import {
  syncGitHubReposMutationKey,
  useIsSyncingGitHubRepos,
} from '@/components/find/use-sync-github-repos'
import type { SyncGitHubReposInput } from '@/features/find/schemas'
import { selectReposToSync } from '@/features/find/sync-eligibility'
import { orpc } from '@/lib/orpc/client'

export function SyncStatusNotice() {
  const isSyncing = useIsSyncingGitHubRepos()
  const { data: githubRepos = [] } = useQuery(
    orpc.find.getConfig.queryOptions({
      select: (data) => data.githubRepos,
    }),
  )

  const pendingVariables = useMutationState({
    filters: {
      mutationKey: [...syncGitHubReposMutationKey],
      status: 'pending',
    },
    select: (mutation): SyncGitHubReposInput | undefined => {
      const variables = mutation.state.variables
      if (
        variables &&
        typeof variables === 'object' &&
        'mode' in variables &&
        (variables.mode === 'stale' || variables.mode === 'force')
      ) {
        return variables as SyncGitHubReposInput
      }
      return undefined
    },
  })

  const variables = pendingVariables.find(Boolean)
  if (!isSyncing || !variables) return null

  const count = selectReposToSync(
    githubRepos,
    variables.mode,
    variables.ids,
  ).length

  if (count < 1) return null

  return (
    <p className='text-sm text-muted-foreground' aria-live='polite'>
      Syncing {count} {count === 1 ? 'repo' : 'repos'}…
    </p>
  )
}
