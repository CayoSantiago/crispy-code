import { cn } from '@repo/ui/lib/utils'

function Dialog({
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'id'> & { id: string }) {
  return (
    <div
      popover='auto'
      className={cn(
        'top-1/2 left-1/2 z-50 open:grid grid-cols-1 w-full max-w-[calc(100%-2rem)] backdrop:bg-black/10 backdrop:backdrop-blur-xs open:backdrop:animate-in open:backdrop:fade-in-0 starting:backdrop:animate-out starting:backdrop:fade-out -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm open:animate-in open:fade-in-0 open:zoom-in-95 starting:animate-out starting:fade-out-0 starting:zoom-out-95',
        className,
      )}
      {...props}
    />
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-header'
      className={cn('flex flex-col gap-1', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot='dialog-footer'
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    >
      {children}
      {/* {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant='outline' />}>
          Close
        </DialogPrimitive.Close>
      )} */}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-title'
      className={cn('font-heading text-sm font-medium', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-description'
      className={cn(
        'text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle }
