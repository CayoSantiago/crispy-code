'use client'

import { Button } from '@repo/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import Link from 'next/link'
import { useActionState } from 'react'
import { resendVerificationEmail } from '@/features/auth/actions'
import {
  type AuthFormState,
  initialAuthFormState,
} from '@/features/auth/schemas'

export function VerifyEmailForm({
  email,
  showEmailField,
  initialState = initialAuthFormState,
}: {
  email?: string
  showEmailField: boolean
  initialState?: AuthFormState
}) {
  const [state, formAction, pending] = useActionState(
    resendVerificationEmail,
    initialState,
  )
  const emailError = state.fieldErrors?.email

  return (
    <form action={formAction}>
      {email && !showEmailField ? (
        <input type='hidden' name='email' value={email} />
      ) : null}
      <FieldGroup className='gap-(--card-spacing)'>
        {showEmailField ? (
          <Field
            className='gap-[calc(var(--card-spacing)/2)]'
            data-invalid={emailError ? true : undefined}
          >
            <FieldLabel htmlFor='email'>Email</FieldLabel>
            <Input
              id='email'
              name='email'
              type='email'
              inputMode='email'
              autoComplete='email'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              defaultValue={email}
              placeholder='m@example.com'
              autoFocus
              required
              aria-invalid={emailError ? true : undefined}
            />
            {emailError ? <FieldError>{emailError}</FieldError> : null}
          </Field>
        ) : null}

        <Field className='gap-[calc(var(--card-spacing)/2)]'>
          {state.error ? (
            <FieldError aria-live='polite'>{state.error}</FieldError>
          ) : null}
          {state.success ? (
            <FieldDescription aria-live='polite'>
              {state.success}
            </FieldDescription>
          ) : null}
          <Button type='submit' disabled={pending}>
            {pending ? 'Sending...' : 'Resend verification email'}
          </Button>
          <FieldDescription className='text-center'>
            Wrong email?{' '}
            <Link className='hover:text-foreground!' href='/signup'>
              Sign up again
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
