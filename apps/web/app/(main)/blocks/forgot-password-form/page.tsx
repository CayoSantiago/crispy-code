import { Button } from '@repo/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import { Code2Icon } from 'lucide-react'
import Link from 'next/link'

export default function BlocksLoginFormPage() {
  return (
    <div className='flex flex-col gap-6 w-full max-w-md'>
      <Link
        href='/'
        className='flex items-center gap-2 self-center font-medium'
      >
        <div className='size-6 grid place-items-center rounded-sm bg-secondary text-secondary-foreground shadow-sm border'>
          <Code2Icon className='size-3.5 stroke-[2.5]' />
        </div>
        Crispy Code
      </Link>

      <Card size='lg'>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl font-medium'>
            Recover Password
          </CardTitle>
          <CardDescription>
            Enter your email to receive a reset link
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form>
            <FieldGroup className='gap-(--card-spacing)'>
              <Field className='gap-[calc(var(--card-spacing)/2)]'>
                <FieldLabel htmlFor='email'>Email</FieldLabel>
                <Input
                  id='email'
                  type='email'
                  placeholder='m@example.com'
                  required
                />
              </Field>

              <Field className='gap-[calc(var(--card-spacing)/2)]'>
                <Button type='submit'>Send Reset Link</Button>
                <FieldDescription className='text-center'>
                  Remembered your password?{' '}
                  <Link
                    className='hover:text-foreground!'
                    href='/blocks/login-form'
                  >
                    Sign in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
