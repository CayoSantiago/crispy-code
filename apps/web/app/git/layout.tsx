import { Suspense } from 'react'
import { GitBreadcrumb } from '@/components/git/git-breadcrumb'
import { BreadcrumbSkeleton } from '@/components/git/skeletons'

export default function GitLayout({ children }: LayoutProps<'/git'>) {
  return (
    <main className='min-h-svh p-6 w-full grid justify-items-center bg-muted/50 dark:bg-background'>
      <div className='grid min-w-0 w-full max-w-3xl gap-6 auto-rows-max items-start'>
        {/* The breadcrumb reads the pathname, which is runtime data on the
            dynamic routes below, so it needs its own boundary. */}
        <Suspense fallback={<BreadcrumbSkeleton />}>
          <GitBreadcrumb />
        </Suspense>
        {children}
      </div>
    </main>
  )
}
