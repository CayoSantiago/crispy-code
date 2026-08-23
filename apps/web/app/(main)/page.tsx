import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@repo/ui/components/item'
import Link from 'next/link'
import { ROOT_NAV } from '@/data/routes'

export default function Page() {
  return (
    <div className='grid grid-cols-1 max-w-md w-full mx-auto gap-8'>
      <h1 className='scroll-m-20 text-3xl font-semibold tracking-tight'>
        Crispy Code
      </h1>

      <ItemGroup>
        {ROOT_NAV.map(({ id, title, desc, href }) => (
          <Item
            key={id}
            size='sm'
            className='-mx-3'
            render={<Link href={href} />}
          >
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
