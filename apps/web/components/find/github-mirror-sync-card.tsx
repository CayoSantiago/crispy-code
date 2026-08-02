'use client'

import { Button } from '@repo/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { getFindConfig, syncSelectedGitHubRepos } from '@/app/find/actions'
import { findKeys } from '@/lib/find/keys'

export function GitHubMirrorSyncCard() {
  const queryClient = useQueryClient()

  const { data: githubRepos } = useQuery({
    queryKey: findKeys.config(),
    queryFn: () => getFindConfig(),
    select: (data) => data.githubRepos,
  })

  const [syncMessages, setSyncMessages] = useState<Record<string, string>>({})

  const syncMutation = useMutation({
    mutationFn: () => syncSelectedGitHubRepos(),
    onSuccess: async (results) => {
      setSyncMessages(
        Object.fromEntries(
          results.map((result) => [
            result.id,
            result.ok ? 'Synced' : `Failed: ${result.message}`,
          ]),
        ),
      )
      await queryClient.invalidateQueries({ queryKey: findKeys.config() })
      await queryClient.invalidateQueries({ queryKey: findKeys.searches() })
    },
  })

  const selectedRepos = useMemo(() => {
    return (
      githubRepos?.map((repo) => ({
        ...repo,
        message: syncMessages[repo.id] ?? 'Idle',
      })) ?? []
    )
  }, [githubRepos, syncMessages])

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub mirror sync</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-3'>
        <Button
          type='button'
          disabled={!githubRepos?.length || syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
        >
          {syncMutation.isPending ? 'Syncing...' : 'Sync selected repositories'}
        </Button>

        {selectedRepos.length ? (
          <div className='grid gap-2'>
            {selectedRepos.map((repo) => (
              <div key={repo.id} className='rounded-md border p-3'>
                <p className='font-mono text-xs'>
                  {repo.owner}/{repo.repo}
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  {repo.message}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No GitHub repos selected yet</EmptyTitle>
              <EmptyDescription>
                Search GitHub repos on the left and check the ones you want to
                include.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  )
}
