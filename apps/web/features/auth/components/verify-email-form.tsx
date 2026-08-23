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
import { resendVerificationEmail } from '@/features/auth/actions'
import { verifyEmailFormOpts } from '@/features/auth/form-opts'
import { forgotPasswordSchema } from '@/features/auth/schemas'

export function VerifyEmailForm({
  email,
  showEmailField,
}: {
  email?: string
  showEmailField: boolean
}) {
  const [state, formAction, pending] = useActionState(
    resendVerificationEmail,
    initialFormState,
  )

  const form = useAppForm({
    ...verifyEmailFormOpts,
    defaultValues: { email: email ?? '' },
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
      {!showEmailField && email ? (
        <input type='hidden' name='email' value={email} />
      ) : null}
      <FieldGroup className='gap-(--card-spacing)'>
        {showEmailField ? (
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
        ) : null}

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
