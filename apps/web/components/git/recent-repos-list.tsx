'use client'

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@repo/ui/components/item'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRightFromSquareIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { readRecentRepos } from '@/features/github/recent-repos'

export function RecentReposList() {
  const { data: repos } = useQuery({
    queryKey: ['recent-repos'],
    queryFn: readRecentRepos,
  })

  return (
    <ItemGroup>
      {repos?.map((recent) => {
        const [owner, repo] = recent.split('/')
        if (!owner || !repo) {
          return null
        }

        return (
          <Item
            key={recent}
            size='xs'
            render={<Link href={`/git/${owner}/${repo}` as Route} />}
          >
            <ItemContent>
              <ItemTitle className='text-sm'>{repo}</ItemTitle>
              <ItemDescription>{owner}</ItemDescription>
            </ItemContent>
            <ItemActions className='opacity-0 group-hover/item:opacity-100 transition-[opacity]'>
              <ArrowUpRightFromSquareIcon className='size-3.5 stroke-[1.6] text-muted-foreground' />
            </ItemActions>
          </Item>
        )
      })}
    </ItemGroup>
  )
}
