import { Button } from '@repo/ui/components/button'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@repo/ui/components/item'
import { ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { BLOCKS_NAV } from '@/data/routes'

export default function BlocksPage() {
  return (
    <div className='grid grid-cols-1 w-full max-w-lg mx-auto gap-8 self-start pt-14'>
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
          Blocks
        </h1>
      </div>

      <ItemGroup className='max-w-md w-full mx-auto'>
        {BLOCKS_NAV.map(({ id, title, desc, href }) => (
          <Item key={id} size='sm' render={<Link href={`/blocks${href}`} />}>
            <ItemContent>
              <ItemTitle>{title}</ItemTitle>
              <ItemDescription>{desc}</ItemDescription>
            </ItemContent>
          </Item>
        ))}
      </ItemGroup>
    </div>
  )
}
