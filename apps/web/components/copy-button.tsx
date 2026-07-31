'use client'

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
