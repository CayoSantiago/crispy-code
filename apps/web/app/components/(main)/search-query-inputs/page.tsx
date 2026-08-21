import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Field, FieldGroup, FieldLabel } from '@repo/ui/components/field'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { BookmarkIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { ComponentPreview } from '@/components/component-preview'
import {
  SearchQueryInput,
  SearchQueryToggle,
} from '@/components/search-query-inputs'
import { highlighter } from '@/lib/highlight'

const pathName = join(process.cwd(), 'components', 'search-query-inputs.tsx')
const code = readFileSync(pathName, 'utf-8')

const props = createHighlightedCodeBlockProps({
  highlighter,
  code,
  lang: 'tsx',
  lineNumbers: true,
})

export const metadata = {
  title: 'Search Query Inputs',
  description:
    'Inputs synced to browser search params with no flash on initial render.',
} satisfies Metadata

export default function ComponentsSearchQueryInputsPage() {
  return (
    <ComponentPreview
      id='search-query-inputs'
      header={metadata.title}
      desc={metadata.description}
      {...props}
    >
      <FieldGroup className='max-w-sm'>
        <Field orientation='horizontal'>
          <FieldLabel htmlFor='bookmark-query-toggle'>Toggle</FieldLabel>
          <SearchQueryToggle queryKey='bookmark' aria-label='Toggle bookmark'>
            <BookmarkIcon />
          </SearchQueryToggle>
        </Field>
        <Field>
          <FieldLabel htmlFor='q-query-input'>Input</FieldLabel>
          <SearchQueryInput queryKey='q' placeholder='Search...' />
        </Field>
      </FieldGroup>
    </ComponentPreview>
  )
}
