import type { Route } from 'next'

export type RouteData = {
  id: string
  title: string
  desc: string
  href: Route
}

export const ROOT_NAV = [
  {
    id: 'components',
    title: 'Components',
    desc: 'Preview the UI components in this workspace.',
    href: '/components',
  },
  {
    id: 'blocks',
    title: 'Blocks',
    desc: 'Collection of commonly used blocks.',
    href: '/blocks',
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
  {
    id: 'ask',
    title: 'Ask',
    desc: 'Ask about your local code and keep a chat history.',
    href: '/ask',
  },
] satisfies RouteData[]

export const COMPONENTS_NAV = [
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
  {
    id: 'glowing-card',
    title: 'Glowing Card',
    desc: 'Card with animated glowing borders.',
    href: '/components/glowing-card',
  },
  {
    id: 'search-query-inputs',
    title: 'Search Query Inputs',
    desc: 'Inputs synced to browser search params with no flash on initial render.',
    href: '/components/search-query-inputs',
  },
  {
    id: 'search-query-tabs',
    title: 'Search Query Tabs',
    desc: 'Tabs synced to browser search params with no flash on initial render.',
    href: '/components/search-query-tabs',
  },
  {
    id: 'local-date-time',
    title: 'Local Date-Time',
    desc: "Display date-time in user's local timezone with no flash on initial render",
    href: '/components/local-date-time',
  },
] satisfies RouteData[]

export const BLOCKS_NAV = [
  {
    id: 'login-form',
    title: 'Login Form',
    desc: 'Simple login form with OAuth options.',
    href: '/blocks/login-form',
  },
  {
    id: 'signup-form',
    title: 'Sign Up Form',
    desc: 'Simple signup form with OAuth options.',
    href: '/blocks/signup-form',
  },
  {
    id: 'forgot-password-form',
    title: 'Forgot Password Form',
    desc: 'Simple forgot password form.',
    href: '/blocks/forgot-password-form',
  },
] satisfies RouteData[]
