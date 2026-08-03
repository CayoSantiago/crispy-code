import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import { ComponentPreview } from '@/components/component-preview'
import { highlighter } from '@/lib/highlight'

const code = `import { cn } from '@repo/ui/lib/utils'
import { cva, VariantProps } from 'class-variance-authority'
import * as React from 'react'

const cardVaraints = cva(
  'group/card flex flex-col gap-(--card-spacing) rounded-lg bg-card py-(--card-spacing) text-xs/relaxed text-card-foreground ring-1 ring-foreground/10 has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg',
  {
    variants: {
      variant: {
        default: 'overflow-hidden',
        'glowing-lg':
          'relative before:absolute before:inset-0 before:rounded-[inherit] before:bg-[conic-gradient(from_var(--gradient-angle),var(--color-red-400),var(--color-blue-400),var(--color-red-400))] before:animate-[rotation_4s_linear_infinite] before:-z-10 after:absolute after:inset-0 after:rounded-[inherit] after:bg-[conic-gradient(from_var(--gradient-angle),var(--color-red-400),var(--color-blue-400),var(--color-red-400))] after:animate-[rotation_4s_linear_infinite] after:-z-10 after:blur-2xl',
        glowing:
          'relative before:absolute before:inset-0 before:rounded-[inherit] before:bg-[conic-gradient(from_var(--gradient-angle),var(--color-red-400),var(--color-blue-400),var(--color-red-400))] before:animate-[rotation_4s_linear_infinite] before:-z-10 after:absolute after:inset-0 after:rounded-[inherit] after:bg-[conic-gradient(from_var(--gradient-angle),var(--color-red-400),var(--color-blue-400),var(--color-red-400))] after:animate-[rotation_4s_linear_infinite] after:-z-10 after:blur-lg',
        'glowing-sm':
          'relative before:absolute before:inset-0 before:rounded-[inherit] before:bg-[conic-gradient(from_var(--gradient-angle),var(--color-red-400),var(--color-blue-400),var(--color-red-400))] before:animate-[rotation_4s_linear_infinite] before:-z-10 after:absolute after:inset-0 after:rounded-[inherit] after:bg-[conic-gradient(from_var(--gradient-angle),var(--color-red-400),var(--color-blue-400),var(--color-red-400))] after:animate-[rotation_4s_linear_infinite] after:-z-10 after:blur-sm',
      },
      size: {
        default: '[--card-spacing:--spacing(4)]',
        sm: '[--card-spacing:--spacing(3)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Card({
  className,
  variant,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardVaraints>) {
  return (
    <div
      data-slot='card'
      data-size={size}
      className={cn(cardVaraints({ variant, size }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-header'
      className={cn(
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-lg px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-title'
      className={cn('font-heading text-sm font-medium', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-description'
      className={cn(
        'text-xs/relaxed text-muted-foreground text-pretty',
        className,
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-action'
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='card-content'
      className={cn('px-(--card-spacing)', className)}
      {...props}
    />
  )
}

const cardFooterVariants = cva(
  'flex items-center rounded-b-lg px-(--card-spacing)',
  {
    variants: {
      variant: {
        default: '[.border-t]:pt-(--card-spacing)',
        muted:
          'bg-muted text-muted-foreground -mb-(--card-spacing) py-[calc(var(--card-spacing)*0.75)] border-t',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function CardFooter({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardFooterVariants>) {
  return (
    <div
      data-slot='card-footer'
      className={cn(cardFooterVariants({ variant }), className)}
      {...props}
    />
  )
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
}

// globals.css

// @keyframes rotation {
//   from {
//     --gradient-angle: 0deg;
//   }
//   to {
//     --gradient-angle: 360deg;
//   }
// }

// inside @theme {}
// --animate-rotation: rotation 4s linear infinite;
`

const props = createHighlightedCodeBlockProps({
  highlighter,
  code,
  lang: 'tsx',
  lineNumbers: true,
})

export default function ComponentsCopyButtonPage() {
  return (
    <ComponentPreview
      id='glowing-card'
      header='Glowing Card'
      desc='Card with animated glowing borders.'
      {...props}
    >
      <Card variant='glowing' className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>Special Offer!</CardTitle>
          <CardDescription>
            Limited time offer, don&apos;t miss out!
          </CardDescription>
        </CardHeader>
      </Card>
    </ComponentPreview>
  )
}
