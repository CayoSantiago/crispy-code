import { Badge } from '@repo/ui/components/badge'
import { cn } from '@repo/ui/lib/utils'
import type { HighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'

export function CodeBlock({
  htmlMarkup,
  copyText,
  lang,
  title,
  tokens,
  className,
  ...props
}: React.ComponentProps<'figure'> & HighlightedCodeBlockProps) {
  return (
    <figure
      className={cn(
        'group/code-block border relative bg-card text-card-foreground rounded-md overflow-clip text-xs/relaxed max-w-full w-full [--code-block-max-height:--spacing(96)]',
        className,
      )}
      {...props}
    >
      {title ? (
        <div className='flex gap-2 p-2 pr-10 bg-muted h-10'>
          <Badge
            variant='outline'
            className='rounded-xs font-mono text-muted-foreground mt-0.5'
          >
            {lang}
          </Badge>
          <figcaption className='font-mono self-center'>{title}</figcaption>
        </div>
      ) : null}

      <CopyButton
        className='absolute z-10 top-2 right-2 first:top-[5.75px] first:right-[5.75px] bg-muted first:bg-inherit! opacity-0 not-first:opacity-100 group-hover/code-block:opacity-100 hover:brightness-97 dark:hover:brightness-150'
        copyText={copyText}
      >
        <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
        <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
        <span className='sr-only'>Copy</span>
      </CopyButton>

      <div
        className='overflow-y-auto no-scrollbar overscroll-y-none [&_pre]:overscroll-x-none h-full max-h-(--code-block-max-height) [&_code]:inline-block [&_pre]:no-scrollbar [&_pre]:overflow-x-auto [&_pre]:contain-content [&_span.th-line]:before:mr-1! [&_pre]:p-2! [&_pre]:bg-inherit!'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: its ok, trust me
        dangerouslySetInnerHTML={{ __html: htmlMarkup }}
      />
    </figure>
  )
}
