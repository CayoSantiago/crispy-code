import { Suspense } from 'react'
import { GitBreadcrumb } from '@/components/git/git-breadcrumb'
import { BreadcrumbSkeleton } from '@/components/git/skeletons'

export default function GitLayout({ children }: LayoutProps<'/git'>) {
  return (
    <div className='grid grid-cols-1 min-w-0 w-full max-w-7xl gap-6 self-start'>
      {/* The breadcrumb reads the pathname, which is runtime data on the
            dynamic routes below, so it needs its own boundary. */}
      <Suspense fallback={<BreadcrumbSkeleton />}>
        <GitBreadcrumb />
      </Suspense>
      {children}
    </div>
  )
}
