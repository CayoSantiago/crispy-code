import { cn } from '@repo/ui/lib/utils'
import { Loader2Icon } from 'lucide-react'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      data-slot='spinner'
      role='status'
      aria-label='Loading'
      className={cn(
        'size-4 animate-spin stroke-[1.6] text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Spinner }
