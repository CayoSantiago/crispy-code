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
import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { orpc } from '@/lib/orpc/client'

export function GitHubMirrorSyncCard() {
  const queryClient = useQueryClient()

  const { data: githubRepos } = useQuery(
    orpc.find.getConfig.queryOptions({
      select: (data) => data.githubRepos,
    }),
  )

  const [syncMessages, setSyncMessages] = useState<Record<string, string>>({})

  const syncMutation = useMutation(
    orpc.find.syncSelectedGitHubRepos.mutationOptions({
      onSuccess: async (results) => {
        setSyncMessages(
          Object.fromEntries(
            results.map((result) => [
              result.id,
              result.ok ? 'Synced' : `Failed: ${result.message}`,
            ]),
          ),
        )
        await queryClient.invalidateQueries({
          queryKey: orpc.find.getConfig.key(),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.find.search.key(),
        })
      },
    }),
  )

  const removeMutation = useMutation(
    orpc.find.removeGitHubRepo.mutationOptions({
      onSuccess: async (_data, { id }) => {
        setSyncMessages((current) => {
          const next = { ...current }
          delete next[id]
          return next
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.find.getConfig.key(),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.find.search.key(),
        })
      },
    }),
  )

  const busy = syncMutation.isPending || removeMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub mirror sync</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-3'>
        <Button
          type='button'
          disabled={!githubRepos?.length || busy}
          onClick={() => syncMutation.mutate()}
        >
          {syncMutation.isPending ? 'Syncing...' : 'Sync selected repositories'}
        </Button>

        {githubRepos?.length ? (
          <div className='grid gap-2'>
            {githubRepos.map((repo) => (
              <div
                key={repo.id}
                className='flex items-start justify-between gap-3 rounded-md border p-3'
              >
                <div className='min-w-0'>
                  <p className='font-mono text-xs'>
                    {repo.owner}/{repo.repo}
                  </p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    {syncMessages[repo.id] ?? 'Idle'}
                  </p>
                </div>
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
