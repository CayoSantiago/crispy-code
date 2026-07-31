import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { ComponentPreview } from '@/components/component-preview'
import { CopyButton } from '@/components/copy-button'
import { highlighter } from '@/lib/highlight'

const code = `'use client'

import { Button } from '@repo/ui/components/button'
import { cn } from '@repo/ui/lib/utils'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function CopyButton({
  copyText,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { copyText: string }) {
  const [showSuccess, setShowSuccess] = useState(false)

  const timeoutRef = useRef<NodeJS.Timeout>(null)

  const handleClick = () => {
    if (showSuccess) return
    navigator.clipboard.writeText(copyText)
    setShowSuccess(true)
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setShowSuccess(false), 2000)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <Button
      variant='ghost'
      size='icon-sm'
      className={cn('disabled:opacity-100', className)}
      onClick={handleClick}
      disabled={showSuccess}
      {...props}
    >
      {showSuccess ? <CheckIcon /> : <CopyIcon />}
      <span className='sr-only'>Copy</span>
    </Button>
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
      <CopyButton size='icon' copyText={props.copyText} />
    </ComponentPreview>
  )
}
