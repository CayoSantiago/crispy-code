import { Suspense } from 'react'
import { CommitList } from '@/components/git/commit-list'
import { RepoHeader } from '@/components/git/repo-header'
import {
  CommitListSkeleton,
  RepoHeaderSkeleton,
} from '@/components/git/skeletons'

export default function RepoPage({
  params,
  searchParams,
}: PageProps<'/git/[owner]/[repo]'>) {
  return (
    <>
      <Suspense fallback={<RepoHeaderSkeleton />}>
        <RepoHeader params={params} />
      </Suspense>

      <Suspense fallback={<CommitListSkeleton />}>
        <CommitList params={params} searchParams={searchParams} />
      </Suspense>
    </>
  )
}
