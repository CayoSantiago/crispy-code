import { Badge } from '@repo/ui/components/badge'
import { StarIcon } from 'lucide-react'
import { notFound } from 'next/navigation'
import { RateLimitNotice } from '@/components/git/rate-limit-notice'
import { getRepo } from '@/lib/github/commits'

export async function RepoHeader({
  params,
}: {
  params: PageProps<'/git/[owner]/[repo]'>['params']
}) {
  const { owner, repo } = await params
  const result = await getRepo(owner, repo)

  if (result.status === 'not-found') {
    notFound()
  }

  if (result.status === 'rate-limited') {
    return <RateLimitNotice resetAt={result.resetAt} />
  }

  if (result.status === 'error') {
    throw new Error(result.message)
  }

  return (
    <div className='grid gap-2 w-full'>
      <h1 className='scroll-m-20 text-3xl font-semibold tracking-tight'>
        {result.data.full_name}
      </h1>

      {result.data.description ? (
        <p className='text-muted-foreground text-sm'>
          {result.data.description}
        </p>
      ) : null}

      <div className='flex gap-2 items-center'>
        <Badge variant='outline' className='font-mono'>
          {result.data.default_branch}
        </Badge>
        <span className='text-muted-foreground text-xs flex gap-1 items-center'>
          <StarIcon className='size-3' />
          {result.data.stargazers_count.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
