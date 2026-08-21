import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import type { Metadata } from 'next'
import { ComponentPreview } from '@/components/component-preview'
import {
  SearchQueryTabs,
  SearchQueryTabsList,
  SearchQueryTabsTrigger,
} from '@/components/search-query-tabs'
import { highlighter } from '@/lib/highlight'

const pathName = join(process.cwd(), 'components', 'search-query-tabs.tsx')
const code = readFileSync(pathName, 'utf-8')

const props = createHighlightedCodeBlockProps({
  highlighter,
  code,
  lang: 'tsx',
  lineNumbers: true,
})

export const metadata = {
  title: 'Search Query Tabs',
  description:
    'Tabs synced to browser search params with no flash on initial render.',
} satisfies Metadata

export default function ComponentsSearchQueryTabsPage() {
  return (
    <ComponentPreview
      id='search-query-tabs'
      header={metadata.title}
      desc={metadata.description}
      {...props}
    >
      <SearchQueryTabs queryKey='tab' defaultValue='overview'>
        <SearchQueryTabsList>
          {['Overview', 'Analytics', 'Reports', 'Settings'].map((item) => (
            <SearchQueryTabsTrigger key={item} value={item.toLowerCase()}>
              {item}
            </SearchQueryTabsTrigger>
          ))}
        </SearchQueryTabsList>
      </SearchQueryTabs>
    </ComponentPreview>
  )
}
