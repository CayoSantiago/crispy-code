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
import { resetPassword } from '@/features/auth/actions'
import { resetPasswordFormOpts } from '@/features/auth/form-opts'
import { resetPasswordSchema } from '@/features/auth/schemas'

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialFormState,
  )

  const form = useAppForm({
    ...resetPasswordFormOpts,
    defaultValues: { ...resetPasswordFormOpts.defaultValues, token },
    transform: useTransform(
      (baseForm) => mergeForm(baseForm, state ?? {}),
      [state],
    ),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: resetPasswordSchema },
    onSubmit: ({ meta }: { meta: FormData }) => {
      startTransition(() => {
        formAction(meta)
      })
    },
  })

  const formErrors = useSelector(form.store, (formState) => formState.errors)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        void form.handleSubmit(formData)
      }}
    >
      <input type='hidden' name='token' value={token} />
      <FieldGroup className='gap-(--card-spacing)'>
        <form.AppField name='password'>
          {(field) => (
            <field.Field className='gap-[calc(var(--card-spacing)/2)]'>
              <field.Label>New password</field.Label>
              <field.TextField
                type='password'
                autoComplete='new-password'
                minLength={8}
                autoFocus
                required
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
              <field.Errors />
            </field.Field>
          )}
        </form.AppField>

        <form.AppField name='confirmPassword'>
          {(field) => (
            <field.Field className='gap-[calc(var(--card-spacing)/2)]'>
              <field.Label>Confirm password</field.Label>
              <field.TextField
                type='password'
                autoComplete='new-password'
                minLength={8}
                required
              />
              <field.Errors />
            </field.Field>
          )}
        </form.AppField>

        <Field className='gap-[calc(var(--card-spacing)/2)]'>
          <FieldError errors={formErrors} className='text-center' />

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
