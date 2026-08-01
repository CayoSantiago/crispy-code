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
  const segments = title?.split('/').filter(Boolean) ?? []
  const [filename = ''] = segments.slice(-1)
  const pathname = segments.slice(0, -1).join('/')

  return (
    <figure
      className={cn(
        'group/code-block border relative bg-card text-card-foreground rounded-md overflow-clip text-xs/relaxed max-w-full w-full [--code-block-max-height:--spacing(96)]',
        className,
      )}
      {...props}
    >
      {title ? (
        <div className='grid grid-cols-[auto_1fr] items-center max-w-full gap-2 p-2 pr-10 bg-muted h-10'>
          <Badge
            variant='outline'
            className='rounded-xs font-mono text-muted-foreground'
          >
            {lang}
          </Badge>
          <figcaption className='font-mono grid grid-cols-[auto_auto_auto] w-fit max-w-full'>
            <span className='truncate text-muted-foreground'>{pathname}</span>
            <span className='text-muted-foreground'>/</span>
            <span>{filename}</span>
          </figcaption>
        </div>
      ) : null}

      <CopyButton
        className='absolute z-10 top-12 right-2 first:top-[5.75px] first:right-[5.75px] bg-inherit! opacity-0 group-hover/code-block:opacity-100 hover:brightness-97 dark:hover:brightness-150'
        copyText={copyText}
      >
        <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
        <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
        <span className='sr-only'>Copy</span>
      </CopyButton>

      <div
        data-slot='code'
        className='overflow-y-auto no-scrollbar overscroll-y-none [&_pre]:overscroll-x-none [&_code]:min-w-full [&_code]:w-fit max-h-(--code-block-max-height) [&_code]:inline-block [&_pre]:no-scrollbar [&_pre]:overflow-x-auto [&_pre]:contain-content [&_span.th-line]:before:mr-1! [&_pre]:p-2! [&_pre]:bg-inherit!'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: its ok, trust me
        dangerouslySetInnerHTML={{ __html: htmlMarkup }}
      />
    </figure>
  )
}
