export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className='grid min-h-svh w-full grid-cols-1 place-items-center bg-muted/50 p-6 dark:bg-background'>
      {children}
    </main>
  )
}
