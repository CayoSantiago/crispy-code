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
import { signInEmail } from '@/features/auth/actions'
import { signinFormOpts } from '@/features/auth/form-opts'
import { signinSchema } from '@/features/auth/schemas'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInEmail,
    initialFormState,
  )

  const form = useAppForm({
    ...signinFormOpts,
    transform: useTransform(
      (baseForm) => mergeForm(baseForm, state ?? {}),
      [state],
    ),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: signinSchema },
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

        <form.AppField name='password'>
          {(field) => (
            <field.Field className='gap-[calc(var(--card-spacing)/2)]'>
              <div className='flex items-center'>
                <field.Label>Password</field.Label>
                <Link
                  href='/forgot-password'
                  className='ml-auto text-xs/relaxed leading-none underline-offset-4 hover:underline'
                >
                  Forgot your password?
                </Link>
              </div>
              <field.TextField
                type='password'
                autoComplete='current-password'
                required
              />
              <field.Errors />
            </field.Field>
          )}
        </form.AppField>

        <Field className='gap-[calc(var(--card-spacing)/2)]'>
          <FieldError errors={formErrors} className='text-center' />

          <Button type='submit' disabled={pending}>
            {pending ? 'Logging in...' : 'Login'}
          </Button>

          <FieldDescription className='text-center'>
            Don&apos;t have an account?{' '}
            <Link className='hover:text-foreground!' href='/signup'>
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
