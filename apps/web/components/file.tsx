import { cn } from '@repo/ui/lib/utils'
import { getFilePathParts } from '@/lib/file'

export function TruncatedFilePath({
  filePath,
  className,
  ...props
}: React.ComponentProps<'div'> & { filePath: string }) {
  const { filename, pathname } = getFilePathParts(filePath)

  return (
    <span className={cn('font-mono flex leading-none', className)} {...props}>
      {pathname ? (
        <>
          <span className='truncate text-muted-foreground'>{pathname}</span>
          <span className='text-muted-foreground'>/</span>
        </>
      ) : null}
      <span className='text-foreground'>{filename}</span>
    </span>
  )
}
