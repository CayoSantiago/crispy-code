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
import { resetPassword } from '@/features/auth/actions'
import {
  type AuthFormState,
  initialAuthFormState,
} from '@/features/auth/schemas'

export function ResetPasswordForm({
  token,
  initialState = initialAuthFormState,
}: {
  token: string
  initialState?: AuthFormState
}) {
  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState,
  )
  const passwordError = state.fieldErrors?.password
  const confirmPasswordError = state.fieldErrors?.confirmPassword

  return (
    <form action={formAction}>
      <input type='hidden' name='token' value={token} />
      <FieldGroup className='gap-(--card-spacing)'>
        <Field
          className='gap-[calc(var(--card-spacing)/2)]'
          data-invalid={passwordError ? true : undefined}
        >
          <FieldLabel htmlFor='password'>New password</FieldLabel>
          <Input
            id='password'
            name='password'
            type='password'
            autoComplete='new-password'
            minLength={8}
            autoFocus
            required
            aria-invalid={passwordError ? true : undefined}
          />
          <FieldDescription>
            Must be at least 8 characters long.
          </FieldDescription>
          {passwordError ? <FieldError>{passwordError}</FieldError> : null}
        </Field>

        <Field
          className='gap-[calc(var(--card-spacing)/2)]'
          data-invalid={confirmPasswordError ? true : undefined}
        >
          <FieldLabel htmlFor='confirm-password'>Confirm password</FieldLabel>
          <Input
            id='confirm-password'
            name='confirmPassword'
            type='password'
            autoComplete='new-password'
            minLength={8}
            required
            aria-invalid={confirmPasswordError ? true : undefined}
          />
          {confirmPasswordError ? (
            <FieldError>{confirmPasswordError}</FieldError>
          ) : null}
        </Field>

        <Field className='gap-[calc(var(--card-spacing)/2)]'>
          {state.error ? (
            <FieldError aria-live='polite'>{state.error}</FieldError>
          ) : null}
          <Button type='submit' disabled={pending}>
            {pending ? 'Updating...' : 'Reset password'}
          </Button>
          <FieldDescription className='text-center'>
            Back to{' '}
            <Link className='hover:text-foreground!' href='/login'>
              Sign in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
