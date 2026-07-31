import { Suspense } from 'react'
import { CommitDetail } from '@/components/git/commit-detail'
import { CommitDetailSkeleton } from '@/components/git/skeletons'

export default function CommitPage({
  params,
}: PageProps<'/git/[owner]/[repo]/commit/[sha]'>) {
  return (
    <Suspense fallback={<CommitDetailSkeleton />}>
      <CommitDetail params={params} />
    </Suspense>
  )
}
