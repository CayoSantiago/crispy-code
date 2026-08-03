'use client'

import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SyncGitHubReposInput } from '@/features/find/schemas'
import { orpc } from '@/lib/orpc/client'

export const syncGitHubReposMutationKey = [
  'find',
  'syncGitHubRepos',
] as const

async function invalidateFindQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({
    queryKey: orpc.find.getConfig.key(),
  })
  await queryClient.invalidateQueries({
    queryKey: orpc.find.search.key(),
  })
}

export function useSyncGitHubReposMutation() {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.find.syncGitHubRepos.mutationOptions({
      mutationKey: [...syncGitHubReposMutationKey],
      onSettled: async () => {
        await invalidateFindQueries(queryClient)
      },
    }),
  )
}

export function useIsSyncingGitHubRepos() {
  return (
    useIsMutating({
      mutationKey: [...syncGitHubReposMutationKey],
    }) > 0
  )
}

export function useSyncGitHubRepos() {
  const mutation = useSyncGitHubReposMutation()
  const isSyncing = useIsSyncingGitHubRepos()

  return {
    sync: (input: SyncGitHubReposInput) => {
      if (input.mode === 'stale' && (mutation.isPending || isSyncing)) {
        return
      }
      mutation.mutate(input)
    },
    syncAsync: (input: SyncGitHubReposInput) => mutation.mutateAsync(input),
    isPending: mutation.isPending || isSyncing,
    variables: mutation.variables,
  }
}
