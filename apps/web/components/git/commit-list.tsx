import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar'
import { Button } from '@repo/ui/components/button'
import { Empty, EmptyHeader, EmptyTitle } from '@repo/ui/components/empty'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@repo/ui/components/item'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RateLimitNotice } from '@/components/git/rate-limit-notice'
import { COMMITS_PER_PAGE, getCommits } from '@/lib/github/commits'
import type { GitHubCommitSummary } from '@/lib/github/types'

function toPageNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function subjectOf(message: string): string {
  return message.split('\n')[0] ?? message
}

function authoredAgo(commit: GitHubCommitSummary): string {
  const date = commit.commit.author?.date

  return date ? new Date(date).toLocaleDateString() : 'unknown date'
}

export async function CommitList({
  params,
  searchParams,
}: {
  params: PageProps<'/git/[owner]/[repo]'>['params']
  searchParams: PageProps<'/git/[owner]/[repo]'>['searchParams']
}) {
  const { owner, repo } = await params
  const page = toPageNumber((await searchParams).page)
  const result = await getCommits(owner, repo, page)

  if (result.status === 'not-found') {
    notFound()
  }

  if (result.status === 'rate-limited') {
    return <RateLimitNotice resetAt={result.resetAt} />
  }

  if (result.status === 'error') {
    throw new Error(result.message)
  }

  if (result.data.length === 0) {
    return (
      <Empty className='border rounded-md bg-card'>
        <EmptyHeader>
          <EmptyTitle>No commits on this page</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className='grid gap-4 w-full grid-cols-1'>
      <ItemGroup>
        {result.data.map((commit) => (
          <Item
            key={commit.sha}
            size='sm'
            render={
              <Link
                href={`/git/${owner}/${repo}/commit/${commit.sha}` as Route}
              />
            }
          >
            <ItemMedia>
              <Avatar className='size-6'>
                {commit.author ? (
                  <AvatarImage src={commit.author.avatar_url} alt='' />
                ) : null}
                <AvatarFallback>
                  {(commit.commit.author?.name ?? '?').slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{subjectOf(commit.commit.message)}</ItemTitle>
              <ItemDescription>
                {commit.commit.author?.name ?? 'Unknown author'} committed{' '}
                {authoredAgo(commit)}
              </ItemDescription>
            </ItemContent>
            <span className='font-mono text-xs text-muted-foreground self-center'>
              {commit.sha.slice(0, 7)}
            </span>
          </Item>
        ))}
      </ItemGroup>

      <div className='flex gap-2 justify-center'>
        {page > 1 ? (
          <Button
            nativeButton={false}
            variant='outline'
            size='sm'
            render={
              <Link href={`/git/${owner}/${repo}?page=${page - 1}` as Route} />
            }
          >
            <ChevronLeftIcon />
            Newer
          </Button>
        ) : null}

        {result.data.length === COMMITS_PER_PAGE ? (
          <Button
            nativeButton={false}
            variant='outline'
            size='sm'
            render={
              <Link href={`/git/${owner}/${repo}?page=${page + 1}` as Route} />
            }
          >
            Older
            <ChevronRightIcon />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
