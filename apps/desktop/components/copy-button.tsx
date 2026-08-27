'use client'

import { Button } from '@repo/ui/components/button'
import { cn } from '@repo/ui/lib/utils'
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
