'use client'

import { SyncStatusNotice } from '@/components/find/sync-status-notice'
import { useAutoSyncGitHubRepos } from '@/components/find/use-auto-sync-github-repos'

export function FindAutoSync() {
  useAutoSyncGitHubRepos()
  return <SyncStatusNotice />
}
