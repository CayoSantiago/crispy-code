'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import {
  useIsSyncingGitHubRepos,
  useSyncGitHubReposMutation,
} from '@/features/find/components/use-sync-github-repos'
import { selectReposToSync } from '@/features/find/sync-eligibility'
import { orpc } from '@/lib/orpc/client'

export function useAutoSyncGitHubRepos() {
  const mutation = useSyncGitHubReposMutation()
  const isSyncing = useIsSyncingGitHubRepos()
  const isSyncingRef = useRef(isSyncing)
  isSyncingRef.current = isSyncing

  const configQuery = useQuery(orpc.find.getConfig.queryOptions())
  const githubRepos = configQuery.data?.githubRepos

  useEffect(() => {
    if (!configQuery.isSuccess || !githubRepos) return

    const runStaleSync = () => {
      if (document.visibilityState !== 'visible') return
      if (isSyncingRef.current) return
      if (selectReposToSync(githubRepos, 'stale').length === 0) return
      mutation.mutate({ mode: 'stale' })
    }

    runStaleSync()

    document.addEventListener('visibilitychange', runStaleSync)
    return () => {
      document.removeEventListener('visibilitychange', runStaleSync)
    }
  }, [configQuery.isSuccess, githubRepos, mutation.mutate])
}
