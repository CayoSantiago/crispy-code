import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import { FieldDescription } from '@repo/ui/components/field'
import { Code2Icon } from 'lucide-react'
import Link from 'next/link'

export function AuthShell({
  title,
  description,
  showTerms = false,
  children,
}: {
  title: string
  description: string
  showTerms?: boolean
  children: React.ReactNode
}) {
  return (
    <div className='flex w-full max-w-md flex-col gap-6'>
      <Link
        href='/'
        className='flex items-center gap-2 self-center font-medium'
      >
        <div className='grid size-6 place-items-center rounded-sm border bg-secondary text-secondary-foreground shadow-sm'>
          <Code2Icon className='size-3.5 stroke-[2.5]' />
        </div>
        Crispy Code
      </Link>

      <Card size='lg'>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl font-medium'>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className='grid grid-cols-1 gap-(--card-spacing)'>
          {children}
        </CardContent>
      </Card>

      {showTerms ? (
        <FieldDescription className='px-6 text-center'>
          By clicking continue, you agree to our{' '}
          <Link className='hover:text-foreground! whitespace-nowrap' href='#'>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link className='hover:text-foreground! whitespace-nowrap' href='#'>
            Privacy Policy
          </Link>
          .
        </FieldDescription>
      ) : null}
    </div>
  )
}
