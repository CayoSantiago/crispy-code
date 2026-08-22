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
import { signUpEmail } from '@/features/auth/actions'
import { signupFormOpts } from '@/features/auth/form-opts'
import { signupSchema } from '@/features/auth/schemas'

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    signUpEmail,
    initialFormState,
  )

  const form = useAppForm({
    ...signupFormOpts,
    transform: useTransform(
      (baseForm) => mergeForm(baseForm, state ?? {}),
      [state],
    ),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signupSchema },
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
      <FieldGroup className='gap-(--card-spacing)'>
        <form.AppField name='name'>
          {(field) => (
            <field.Field className='gap-[calc(var(--card-spacing)/2)]'>
              <field.Label>Full Name</field.Label>
              <field.TextField
                autoComplete='name'
                placeholder='John Doe'
                autoFocus
                required
              />
              <field.Errors />
            </field.Field>
          )}
        </form.AppField>

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
                required
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
              <field.Errors />
            </field.Field>
          )}
        </form.AppField>

        <form.AppField name='password'>
          {(field) => (
            <field.Field className='gap-[calc(var(--card-spacing)/2)]'>
              <field.Label>Password</field.Label>
              <field.TextField
                type='password'
                autoComplete='new-password'
                minLength={8}
                required
              />
              <field.Errors />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </field.Field>
          )}
        </form.AppField>

        <Field className='gap-[calc(var(--card-spacing)/2)]'>
          <FieldError errors={formErrors} className='text-center' />

          <Button type='submit' disabled={pending}>
            {pending ? 'Creating account...' : 'Create Account'}
          </Button>

          <FieldDescription className='text-center'>
            Already have an account?{' '}
            <Link className='hover:text-foreground!' href='/login'>
              Sign in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
