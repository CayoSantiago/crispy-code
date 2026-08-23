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
  FieldSeparator,
} from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import { Code2Icon } from 'lucide-react'
import Link from 'next/link'
import GitHubIcon from '@/assets/icons/github.svg'
import GoogleIcon from '@/assets/icons/google.svg'

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
          <CardTitle className='text-xl font-medium'>Welcome back</CardTitle>
          <CardDescription>
            Login with your Google or GitHub account
          </CardDescription>
        </CardHeader>

        <CardContent className='grid grid-cols-1 gap-(--card-spacing)'>
          <div className='grid grid-cols-2 gap-[calc(var(--card-spacing)/2)]'>
            <Button variant='outline' type='button' className='gap-1.5'>
              <GoogleIcon />
              Login with Google
            </Button>
            <Button variant='outline' type='button' className='gap-1.5'>
              <GitHubIcon />
              Login with GitHub
            </Button>
          </div>

          <FieldSeparator className='*:data-[slot=field-separator-content]:bg-card'>
            Or continue with
          </FieldSeparator>

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
                <div className='flex items-center'>
                  <FieldLabel htmlFor='password'>Password</FieldLabel>
                  <Link
                    href='/blocks/forgot-password-form'
                    className='ml-auto text-xs/relaxed leading-none underline-offset-4 hover:underline'
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input id='password' type='password' required />
              </Field>

              <Field className='gap-[calc(var(--card-spacing)/2)]'>
                <Button type='submit'>Login</Button>
                <FieldDescription className='text-center'>
                  Don&apos;t have an account?{' '}
                  <Link
                    className='hover:text-foreground!'
                    href='/blocks/signup-form'
                  >
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className='px-6 text-center'>
        By clicking continue, you agree to our{' '}
        <Link className='hover:text-foreground!' href='#'>
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link className='hover:text-foreground!' href='#'>
          Privacy Policy
        </Link>
        .
      </FieldDescription>
    </div>
  )
}
