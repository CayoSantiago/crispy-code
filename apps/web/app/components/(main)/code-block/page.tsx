import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import type { Metadata } from 'next'
import { CodeBlock } from '@/components/code-block'
import { ComponentPreview } from '@/components/component-preview'
import { highlighter } from '@/lib/highlight'

const code = `import { Badge } from '@repo/ui/components/badge'
import { cn } from '@repo/ui/lib/utils'
import type { HighlightedCodeBlockProps } from '@tanstack/highlight/react'
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
        'group/code-block border relative bg-card text-card-foreground rounded-md overflow-clip text-xs/relaxed max-w-5xl',
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
      />

      <div
        className='overflow-y-auto no-scrollbar max-h-96 [&_code]:inline-block [&_pre]:no-scrollbar [&_pre]:overflow-x-auto [&_pre]:px-3! [&_pre]:contain-content [&_span.th-line]:before:mr-1! [&_pre]:py-2! [&_pre]:bg-inherit!'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: its ok, trust me
        dangerouslySetInnerHTML={{ __html: htmlMarkup }}
      />
    </figure>
  )
}
`

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

export default function ExampleCodeBlock1() {
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
