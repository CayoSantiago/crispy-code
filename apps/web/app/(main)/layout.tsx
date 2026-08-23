import { AppHeader } from '@/components/app-header'

export default function MainLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <AppHeader />

      <main className='p-6 pt-22 min-h-svh w-full grid grid-cols-1 justify-items-center items-start bg-muted/50 dark:bg-background'>
        {children}
      </main>
    </>
  )
}
