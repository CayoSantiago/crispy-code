import { formOptions } from '@tanstack/react-form-nextjs'

export const signinFormOpts = formOptions({
  defaultValues: { email: '', password: '' },
})

export const signupFormOpts = formOptions({
  defaultValues: { name: '', email: '', password: '' },
})
