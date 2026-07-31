import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { ComponentPreview } from '@/components/component-preview'
import { CopyButton } from '@/components/copy-button'
import { highlighter } from '@/lib/highlight'

const code = `'use client'

import { Button } from '@repo/ui/components/button'
import { cn } from '@repo/ui/lib/utils'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

export function CopyButton({
  copyText,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { copyText: string }) {
  const { copyToClipboard, isCopied } = useCopyToClipboard()

  return (
    <Button
      variant='ghost'
      size='icon-sm'
      className={cn(
        'group/copy-button relative grid grid-cols-1 grid-rows-1 disabled:opacity-100',
        className,
      )}
      onClick={() => copyToClipboard(copyText)}
      disabled={isCopied}
      data-copied={isCopied}
      {...props}
    />
  )
}

// Usage
export function ExampleUsage() {
  return (
    <CopyButton size='icon' copyText={props.copyText}>
      <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
      <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
      <span className='sr-only'>Copy</span>
    </CopyButton>
  )
}
`

const props = createHighlightedCodeBlockProps({
  highlighter,
  code,
  lang: 'tsx',
  lineNumbers: true,
})

export default function ComponentsCopyButtonPage() {
  return (
    <ComponentPreview
      id='copy-button'
      header='Copy Button'
      desc='Button to copy text to clip board with confirmation.'
      {...props}
    >
      <CopyButton size='icon' copyText={props.copyText}>
        <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
        <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
        <span className='sr-only'>Copy</span>
      </CopyButton>
    </ComponentPreview>
  )
}
