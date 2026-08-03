import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import type { Metadata } from 'next'
import { ComponentPreview } from '@/components/component-preview'
import { highlighter } from '@/lib/highlight'

const code = ``

const props = createHighlightedCodeBlockProps({
  highlighter,
  code,
  lang: 'tsx',
  lineNumbers: true,
})

export const metadata = {
  title: 'Combobox',
  description: 'Simple combobox component.',
} satisfies Metadata

export default function ComponentsComboboxPage() {
  return (
    <ComponentPreview
      id='search-query-inputs'
      header={metadata.title}
      desc={metadata.description}
      {...props}
    ></ComponentPreview>
  )
}
