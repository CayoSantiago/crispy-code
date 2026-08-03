import { cn } from '@repo/ui/lib/utils'
import type { HighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { TruncatedFilePath } from './file'
import { FileIcon } from './file-icon'

const codeBlockVariants = cva(
  'group/code-block border relative bg-card text-card-foreground rounded-md overflow-clip text-xs/relaxed max-w-full w-full',
  {
    variants: {
      variant: {
        scroll:
          '[--code-block-max-height:--spacing(96)] [&_div]:data-[slot="code"]:overflow-y-auto',
        full: '[--code-block-max-height:--spacing(full)] [&_div]:data-[slot="code"]:overflow-y-visible',
      },
    },
    defaultVariants: {
      variant: 'scroll',
    },
  },
)

export function CodeBlock({
  htmlMarkup,
  copyText,
  lang,
  variant,
  className,
  children,
  noCopy = false,
  ...props
}: React.ComponentProps<'figure'> &
  HighlightedCodeBlockProps &
  VariantProps<typeof codeBlockVariants> & { noCopy?: boolean }) {
  return (
    <figure
      className={cn(codeBlockVariants({ variant }), className)}
      {...props}
    >
      {children}

      {noCopy ? null : (
        <CopyButton
          className='absolute z-10 top-12 right-2 first:top-[5.75px] first:right-[5.75px] bg-inherit! opacity-0 group-hover/code-block:opacity-100 hover:brightness-97 dark:hover:brightness-150'
          copyText={copyText}
        >
          <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
          <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
          <span className='sr-only'>Copy</span>
        </CopyButton>
      )}

      <div
        data-slot='code'
        className='no-scrollbar overscroll-y-none [&_pre]:overscroll-x-none [&_code]:min-w-full [&_code]:w-fit max-h-(--code-block-max-height) [&_code]:inline-block [&_pre]:no-scrollbar [&_pre]:overflow-x-auto [&_pre]:contain-content [&_span.th-line]:before:mr-1! [&_pre]:p-2! [&_pre]:bg-inherit!'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: its ok, trust me
        dangerouslySetInnerHTML={{ __html: htmlMarkup }}
      />
    </figure>
  )
}

export function CodeBlockHeader({
  filePath,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { filePath: string }) {
  return (
    <div
      className={cn(
        'flex items-center max-w-full gap-1.5 p-2 pr-3 bg-muted h-10',
        className,
      )}
      {...props}
    >
      <FileIcon filePath={filePath} />

      <figcaption className='min-w-0'>
        <TruncatedFilePath filePath={filePath} />
      </figcaption>

      {children}
    </div>
  )
}
