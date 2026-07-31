import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@repo/ui/components/item'
import type { Route } from 'next'
import Link from 'next/link'

const sections: Array<{
  desc: string
  href: Route
  id: string
  title: string
}> = [
  {
    id: 'components',
    title: 'Components',
    desc: 'Preview the UI components in this workspace.',
    href: '/components',
  },
  {
    id: 'git',
    title: 'Git',
    desc: 'Connect a public GitHub repository and read its commit diffs.',
    href: '/git',
  },
]

export default function Page() {
  return (
    <main className='min-h-svh p-6 pt-20 w-full grid justify-items-center'>
      <div className='grid max-w-md min-w-0 w-full gap-12 auto-rows-max items-start'>
        <h1 className='scroll-m-20 text-3xl font-semibold tracking-tight'>
          Crispy Code
        </h1>
        <ItemGroup>
          {sections.map(({ id, title, desc, href }) => (
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
