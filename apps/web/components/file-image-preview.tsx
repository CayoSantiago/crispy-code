import { cn } from '@repo/ui/lib/utils'
import { CodeBlockHeader } from '@/components/code-block'

export function FileImagePreview({
  filePath,
  formatLabel,
  src,
  className,
  children,
  ...props
}: React.ComponentProps<'figure'> & {
  filePath: string
  formatLabel: string
  src: string
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

      <div className='flex justify-center bg-muted/40 p-4'>
        {/* Data URL of bytes we already inspected; not a remote image. */}
        {/* biome-ignore lint/performance/noImgElement: data-URL preview, not a Next image asset */}
        <img
          src={src}
          alt={filePath}
          className='max-h-[min(70vh,40rem)] max-w-full h-auto w-auto object-contain'
        />
      </div>
    </figure>
  )
}
