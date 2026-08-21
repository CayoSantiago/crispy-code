import type { Route } from 'next'

export type BaseRoute = Route extends `${infer S}`
  ? S extends `/${infer B}/${infer _}`
    ? `/${B}`
    : S extends `/${infer B}`
      ? `/${B}`
      : never
  : never

export type SubRoute<TBase extends BaseRoute> = Route extends `${infer S}`
  ? S extends `${TBase}${infer R}`
    ? `${R}`
    : never
  : never

export const ROOT_NAV: Array<{
  id: string
  title: string
  desc: string
  href: BaseRoute
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
  {
    id: 'find',
    title: 'Code Finder',
    desc: 'Search local and GitHub project code in one place.',
    href: '/find',
  },
]

export const COMPONENTS_NAV: Array<{
  id: string
  title: string
  desc: string
  href: SubRoute<'/components'>
}> = [
  {
    id: 'copy-button',
    title: 'Copy Button',
    desc: 'Button to copy text to clip board with confirmation.',
    href: '/copy-button',
  },
  {
    id: 'code-block',
    title: 'Code Block',
    desc: 'Code block to display code with line numbers, syntax highlighting, line highlighting, and copy functionality.',
    href: '/code-block',
  },
  {
    id: 'browser',
    title: 'Browser',
    desc: 'Visually display websites.',
    href: '/browser',
  },
  {
    id: 'glowing-card',
    title: 'Glowing Card',
    desc: 'Card with animated glowing borders.',
    href: '/glowing-card',
  },
  {
    id: 'search-query-inputs',
    title: 'Search Query Inputs',
    desc: 'Inputs synced to browser search params with no flash on initial render.',
    href: '/search-query-inputs',
  },
  {
    id: 'search-query-tabs',
    title: 'Search Query Tabs',
    desc: 'Tabs synced to browser search params with no flash on initial render.',
    href: '/search-query-tabs',
  },
]
