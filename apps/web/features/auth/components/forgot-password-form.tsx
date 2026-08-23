'use client'

import { useAppForm } from '@repo/form'
import { Button } from '@repo/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from '@repo/ui/components/field'
import {
  initialFormState,
  mergeForm,
  revalidateLogic,
  useSelector,
  useTransform,
} from '@tanstack/react-form-nextjs'
import Link from 'next/link'
import { startTransition, useActionState } from 'react'
import { requestPasswordReset } from '@/features/auth/actions'
import { forgotPasswordFormOpts } from '@/features/auth/form-opts'
import { forgotPasswordSchema } from '@/features/auth/schemas'

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialFormState,
  )

  const form = useAppForm({
    ...forgotPasswordFormOpts,
    transform: useTransform(
      (baseForm) => mergeForm(baseForm, state ?? {}),
      [state],
    ),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: forgotPasswordSchema },
    onSubmit: ({ meta }: { meta: FormData }) => {
      startTransition(() => {
        formAction(meta)
      })
    },
  })

  const formErrors = useSelector(form.store, (formState) => formState.errors)
  const success =
    'success' in state && typeof state.success === 'string'
      ? state.success
      : undefined

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        void form.handleSubmit(formData)
      }}
    >
      <FieldGroup className='gap-(--card-spacing)'>
        <form.AppField name='email'>
          {(field) => (
            <field.Field className='gap-[calc(var(--card-spacing)/2)]'>
              <field.Label>Email</field.Label>
              <field.TextField
                type='email'
                inputMode='email'
                autoComplete='email'
                autoCapitalize='none'
                autoCorrect='off'
                spellCheck={false}
                placeholder='m@example.com'
                autoFocus
                required
              />
              <field.Errors />
            </field.Field>
          )}
        </form.AppField>

        <Field className='gap-[calc(var(--card-spacing)/2)]'>
          <FieldError errors={formErrors} className='text-center' />

          {success ? (
            <FieldDescription
              aria-live='polite'
              className='text-center text-emerald-600'
            >
              {success}
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
