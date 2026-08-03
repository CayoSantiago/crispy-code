'use client'

import { Button } from '@repo/ui/components/button'
import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readRecentRepos } from '@/features/github/recent-repos'

export function RecentReposList() {
  const [repos, setRepos] = useState<string[]>([])

  useEffect(() => {
    setRepos(readRecentRepos())
  }, [])

  if (repos.length === 0) {
    return null
  }

  return (
    <div className='flex flex-wrap gap-2 items-center'>
      <span className='text-xs text-muted-foreground'>Recent:</span>
      {repos.map((recent) => {
        const [owner, repo] = recent.split('/')
        if (!owner || !repo) {
          return null
        }

        return (
          <Button
            key={recent}
            nativeButton={false}
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            render={<Link href={`/git/${owner}/${repo}` as Route} />}
          >
            {recent}
          </Button>
        )
      })}
    </div>
  )
}
