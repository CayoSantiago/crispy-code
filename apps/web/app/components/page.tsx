import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@repo/ui/components/item'
import type { Route } from 'next'
import Link from 'next/link'

const components: { id: string; title: string; desc?: string; href: Route }[] =
  [
    {
      id: 'copy-button',
      title: 'Copy Button',
      desc: 'Button to copy text to clip board with confirmation.',
      href: '/components/copy-button',
    },
    {
      id: 'code-block',
      title: 'Code Block',
      desc: 'Code block to display code with line numbers, syntax highlighting, line highlighting, and copy functionality.',
      href: '/components/code-block',
    },
    {
      id: 'browser',
      title: 'Browser',
      desc: 'Visually display websites.',
      href: '/components/browser',
    },
  ]

export default function ComponentsPage() {
  return (
    <main className='min-h-svh p-6 w-full grid justify-items-center bg-muted/50 dark:bg-background'>
      <div className='grid grid-cols-1 min-w-0 w-full gap-12 place-items-center min-h-full'>
        <div className='max-w-md w-full flex flex-col self-stretch gap-8'>
          <h1 className='scroll-m-20 text-3xl font-semibold tracking-tight'>
            Components
          </h1>
          <ItemGroup className='max-w-md'>
            {components.map(({ id, title, desc, href }) => (
              <Item key={id} size='sm' render={<Link href={href} />}>
                <ItemContent>
                  <ItemTitle>{title}</ItemTitle>
                  <ItemDescription>{desc}</ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </div>
      </div>
    </main>
  )
}
