import { Badge } from '@repo/ui/components/badge'
import { StarIcon } from 'lucide-react'
import { notFound } from 'next/navigation'
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

  // The commit list below shares the same rate limit and explains the state, so
  // showing a second notice here would just duplicate it.
  if (result.status === 'rate-limited') {
    return (
      <h1 className='scroll-m-20 text-3xl font-semibold tracking-tight'>
        {owner}/{repo}
      </h1>
    )
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
