import { formOptions } from '@tanstack/react-form-nextjs'

export const signinFormOpts = formOptions({
  defaultValues: { email: '', password: '' },
})

export const signupFormOpts = formOptions({
  defaultValues: { name: '', email: '', password: '' },
})

export const forgotPasswordFormOpts = formOptions({
  defaultValues: { email: '' },
})

export const resetPasswordFormOpts = formOptions({
  defaultValues: { token: '', password: '', confirmPassword: '' },
})

export const verifyEmailFormOpts = formOptions({
  defaultValues: { email: '' },
})
