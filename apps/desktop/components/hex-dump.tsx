import { cn } from '@repo/ui/lib/utils'
import { CodeBlockHeader } from '@/components/code-block'

export function HexDump({
  filePath,
  formatLabel,
  dump,
  className,
  children,
  ...props
}: React.ComponentProps<'figure'> & {
  filePath: string
  formatLabel: string
  dump: string
}) {
  return (
    <figure
      className={cn(
        'border relative bg-card text-card-foreground rounded-md overflow-clip text-xs/relaxed max-w-full w-full',
        className,
      )}
      {...props}
    >
      <CodeBlockHeader filePath={filePath}>
        <span className='ml-auto shrink-0 text-muted-foreground font-mono'>
          {formatLabel}
        </span>
        {children}
      </CodeBlockHeader>
      <pre className='font-mono p-2 overflow-x-auto no-scrollbar overscroll-x-none'>
        {dump}
      </pre>
    </figure>
  )
}
