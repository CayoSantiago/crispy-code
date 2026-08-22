'use client'

import { SyncStatusNotice } from '@/features/find/components/sync-status-notice'
import { useAutoSyncGitHubRepos } from '@/features/find/components/use-auto-sync-github-repos'

export function FindAutoSync() {
  useAutoSyncGitHubRepos()
  return <SyncStatusNotice />
}
