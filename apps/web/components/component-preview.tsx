import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import { cn } from '@repo/ui/lib/utils'
import { CodeBlock } from './code-block'

export function ComponentPreview({
  children,
  id,
  header,
  desc,
  className,
  ...props
}: React.ComponentProps<typeof CodeBlock> & {
  id: string
  header?: string
  desc?: string
}) {
  return (
    <Card className={cn('pb-0 h-max max-w-3xl', className)}>
      <CardHeader>
        {header ? <CardTitle>{header}</CardTitle> : null}
        {desc ? <CardDescription>{desc}</CardDescription> : null}
      </CardHeader>

      <CardContent className='grid grid-cols-1 auto-rows-fr place-items-center min-h-64'>
        {children}
      </CardContent>

      <CodeBlock
        className='rounded-t-none rounded-b-[inherit] border-0 border-t [--code-block-max-height:--spacing(64)]'
        {...props}
      />
    </Card>
  )
}
