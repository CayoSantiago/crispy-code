export default function FindLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className='min-h-svh p-6 w-full bg-muted/50 dark:bg-background'>
      <div className='grid grid-cols-1 gap-6 w-full max-w-7xl mx-auto'>
        {children}
      </div>
    </main>
  )
}
