import { env } from '@repo/env/next'
import { Button } from '@repo/ui/components/button'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@repo/ui/components/item'
import { ChevronLeftIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { COMPONENTS_NAV } from '@/data/routes'

export const metadata = {
  title: 'Components',
  description: 'List of custom made components.',
} satisfies Metadata

console.log('\n\n\n', env, '\n\n\n')

export default function ComponentsPage() {
  return (
    <main className='min-h-svh w-full p-6 pt-20'>
      <div className='grid grid-cols-1 w-full max-w-lg mx-auto gap-8'>
        <div className='flex items-center gap-2'>
          <Button
            nativeButton={false}
            aria-label='Go to home page'
            variant='ghost'
            size='icon-lg'
            render={<Link href='/' />}
          >
            <ChevronLeftIcon />
          </Button>
          <h1 className='scroll-m-20 text-3xl font-semibold tracking-tight'>
            Components
          </h1>
        </div>

        <ItemGroup className='max-w-md w-full mx-auto'>
          {COMPONENTS_NAV.map(({ id, title, desc, href }) => (
            <Item key={id} size='sm' render={<Link href={href} />}>
              <ItemContent>
                <ItemTitle>{title}</ItemTitle>
                <ItemDescription>{desc}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </div>
    </main>
  )
}
