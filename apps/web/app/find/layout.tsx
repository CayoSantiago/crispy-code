export default function FindLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className='min-h-svh p-6 w-full grid justify-items-center bg-muted/50 dark:bg-background'>
      <div className='grid grid-cols-1 min-w-0 w-full max-w-7xl gap-6 auto-rows-max items-start'>
        {children}
      </div>
    </main>
  )
}
