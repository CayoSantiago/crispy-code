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

export default function BlocksSignUpFormPage() {
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
            Create an account
          </CardTitle>
          <CardDescription>
            Enter your information below to create your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form>
            <FieldGroup className='gap-(--card-spacing)'>
              <Field className='gap-[calc(var(--card-spacing)/2)]'>
                <FieldLabel htmlFor='name'>Full Name</FieldLabel>
                <Input id='name' placeholder='John Doe' required />
              </Field>

              <Field className='gap-[calc(var(--card-spacing)/2)]'>
                <FieldLabel htmlFor='email'>Email</FieldLabel>
                <Input
                  id='email'
                  type='email'
                  placeholder='m@example.com'
                  required
                />
                <FieldDescription>
                  We&apos;ll use this to contact you. We will not share your
                  email with anyone else.
                </FieldDescription>
              </Field>

              <Field className='gap-[calc(var(--card-spacing)/2)]'>
                <FieldLabel htmlFor='password'>Password</FieldLabel>
                <Input id='password' type='password' required />
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>

              <Field className='gap-[calc(var(--card-spacing)/2)]'>
                <FieldLabel htmlFor='confirm-password'>
                  Confirm Password
                </FieldLabel>
                <Input id='confirm-password' type='password' required />
                <FieldDescription>
                  Please confirm your password.
                </FieldDescription>
              </Field>

              <Button type='submit'>Create Account</Button>

              <FieldSeparator className='*:data-[slot=field-separator-content]:bg-card'>
                Or continue with
              </FieldSeparator>

              <Field className='gap-[calc(var(--card-spacing)/2)]'>
                <div className='grid grid-cols-2 gap-[calc(var(--card-spacing)/2)]'>
                  <Button variant='outline' type='button' className='gap-1.5'>
                    <GoogleIcon />
                    Sign up with Google
                  </Button>
                  <Button variant='outline' type='button' className='gap-1.5'>
                    <GitHubIcon />
                    Sign up with GitHub
                  </Button>
                </div>

                <FieldDescription className='text-center'>
                  Already have an account?{' '}
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
