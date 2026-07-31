import { GitBreadcrumb } from '@/components/git/git-breadcrumb'

export default function GitLayout({ children }: LayoutProps<'/git'>) {
  return (
    <main className='min-h-svh p-6 w-full grid justify-items-center bg-muted/50 dark:bg-background'>
      <div className='grid min-w-0 w-full max-w-3xl gap-6 auto-rows-max items-start'>
        <GitBreadcrumb />
        {children}
      </div>
    </main>
  )
}
