import { Badge } from '@repo/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import { notFound } from 'next/navigation'
import { FileDiff } from '@/components/git/file-diff'
import { RateLimitNotice } from '@/components/git/rate-limit-notice'
import { getCommit } from '@/features/github/commits'

// GitHub caps the files array in a commit response at 300 entries.
const FILE_LIMIT = 300

export async function CommitDetail({
  params,
}: {
  params: PageProps<'/git/[owner]/[repo]/commit/[sha]'>['params']
}) {
  const { owner, repo, sha } = await params
  const result = await getCommit(owner, repo, sha)

  if (result.status === 'not-found') {
    notFound()
  }

  if (result.status === 'rate-limited') {
    return <RateLimitNotice resetAt={result.resetAt} />
  }

  if (result.status === 'error') {
    throw new Error(result.message)
  }

  const commit = result.data
  const [subject, ...rest] = commit.commit.message.split('\n')
  const body = rest.join('\n').trim()
  const files = commit.files ?? []

  return (
    <div className='grid gap-6 w-full'>
      <Card>
        <CardHeader>
          <CardTitle>{subject}</CardTitle>
          <CardDescription>
            {commit.commit.author?.name ?? 'Unknown author'} committed{' '}
            {commit.commit.author?.date
              ? new Date(commit.commit.author.date).toLocaleString()
              : 'at an unknown time'}
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          {body ? (
            <pre className='text-xs whitespace-pre-wrap font-mono text-muted-foreground'>
              {body}
            </pre>
          ) : null}

          <div className='flex gap-2 items-center'>
            <Badge variant='outline' className='font-mono'>
              {commit.sha.slice(0, 7)}
            </Badge>
            <span className='text-xs text-emerald-600 dark:text-emerald-400'>
              +{commit.stats?.additions ?? 0}
            </span>
            <span className='text-xs text-red-600 dark:text-red-400'>
              -{commit.stats?.deletions ?? 0}
            </span>
            <span className='text-xs text-muted-foreground'>
              {files.length} {files.length === 1 ? 'file' : 'files'} changed
            </span>
          </div>
        </CardContent>
      </Card>

      {files.map((file) => (
        <FileDiff key={file.filename} file={file} />
      ))}

      {files.length >= FILE_LIMIT ? (
        <p className='text-muted-foreground text-sm text-center'>
          GitHub returns at most {FILE_LIMIT} files per commit, so this list is
          truncated.
        </p>
      ) : null}
    </div>
  )
}
