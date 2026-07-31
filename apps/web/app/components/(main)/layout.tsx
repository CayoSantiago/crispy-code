import { Button } from '@repo/ui/components/button'
import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'

export default function ComponentsLayout({
  children,
}: LayoutProps<'/components'>) {
  return (
    <main className='min-h-svh p-6 w-full grid justify-items-center bg-muted/50 dark:bg-background'>
      <div className='grid grid-cols-[28px_1fr_28px] min-w-0 w-full gap-12 place-items-center min-h-full'>
        <Button
          nativeButton={false}
          variant='ghost'
          size='icon'
          className='self-start'
          render={<Link href='/components' />}
        >
          <ChevronLeftIcon />
        </Button>
        {children}
      </div>
    </main>
  )
}
