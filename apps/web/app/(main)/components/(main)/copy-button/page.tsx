import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { ComponentPreview } from '@/components/component-preview'
import { CopyButton } from '@/components/copy-button'
import { highlighter } from '@/lib/highlighter'

const pathName = join(process.cwd(), 'components', 'copy-button.tsx')
const code = readFileSync(pathName, 'utf-8')

const props = createHighlightedCodeBlockProps({
  highlighter,
  code,
  lang: 'tsx',
  lineNumbers: true,
})

export const metadata = {
  title: 'Copy Button',
  description: 'Button to copy text to clip board with confirmation.',
} satisfies Metadata

export default function ComponentsCopyButtonPage() {
  return (
    <ComponentPreview
      id='copy-button'
      header={metadata.title}
      desc={metadata.description}
      {...props}
    >
      <CopyButton
        size='icon'
        copyText='Hello Clipboard!'
        aria-label='Copy'
        className='text-muted-foreground'
      >
        <CheckIcon className='absolute inset-0 m-auto opacity-0 scale-0 group-data-[copied="true"]/copy-button:opacity-100 group-data-[copied="true"]/copy-button:scale-100 transition-[opacity,scale]' />
        <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0 group-data-[copied="true"]/copy-button:scale-0 transition-[opacity,scale]' />
      </CopyButton>
    </ComponentPreview>
  )
}
