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
import { requestPasswordReset } from '@/features/auth/actions'
import {
  type AuthFormState,
  initialAuthFormState,
} from '@/features/auth/schemas'

export function ForgotPasswordForm({
  initialState = initialAuthFormState,
}: {
  initialState?: AuthFormState
}) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  )
  const emailError = state.fieldErrors?.email

  return (
    <form action={formAction}>
      <FieldGroup className='gap-(--card-spacing)'>
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
            placeholder='m@example.com'
            autoFocus
            required
            aria-invalid={emailError ? true : undefined}
          />
          {emailError ? <FieldError>{emailError}</FieldError> : null}
        </Field>

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
            {pending ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <FieldDescription className='text-center'>
            Remembered your password?{' '}
            <Link className='hover:text-foreground!' href='/login'>
              Sign in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
