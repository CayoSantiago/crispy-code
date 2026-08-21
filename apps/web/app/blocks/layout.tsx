export default function BlocksLayout({ children }: LayoutProps<'/blocks'>) {
  return (
    <main className='min-h-svh p-6 w-full grid grid-cols-1 place-items-center bg-muted/50 dark:bg-background'>
      {children}
    </main>
  )
}
