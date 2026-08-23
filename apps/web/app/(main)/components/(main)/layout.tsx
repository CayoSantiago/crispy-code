import { Button } from '@repo/ui/components/button'
import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'

export default function ComponentsLayout({
  children,
}: LayoutProps<'/components'>) {
  return (
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
  )
}
