import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import type { Metadata } from 'next'
import { CodeBlock } from '@/components/code-block'
import { ComponentPreview } from '@/components/component-preview'
import { highlighter } from '@/lib/highlight'

const pathName = join(process.cwd(), 'components', 'code-block.tsx')
const code = readFileSync(pathName, 'utf-8')

const props = createHighlightedCodeBlockProps({
  highlighter,
  code,
  lang: 'tsx',
  lineNumbers: true,
  decorations: [
    { lines: [7, 12], className: 'th-line--deleted' },
    { lines: [17, 21], className: 'th-line--inserted' },
  ],
})

export const metadata = {
  title: 'Code Block',
  description:
    'Code block to display code with line numbers, syntax highlighting, line highlighting, and copy functionality.',
} satisfies Metadata

export default function ComponentsCodeBlockPage() {
  return (
    <ComponentPreview
      id='code-block'
      header={metadata.title}
      desc={metadata.description}
      {...props}
    >
      <CodeBlock {...props} />
    </ComponentPreview>
  )
}
