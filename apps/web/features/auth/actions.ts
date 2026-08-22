'use server'

import { enabledSocialProviders } from '@repo/auth/config'
import { auth } from '@repo/auth/server'
import {
  createServerValidate,
  type ServerFormState,
  ServerValidateError,
} from '@tanstack/react-form-nextjs'
import type { Route } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  FORGOT_PASSWORD_SUCCESS,
  isRateLimited,
  mapLoginErrorMessage,
  mapResetPasswordError,
  mapSignupErrorMessage,
  mapVerificationError,
  RATE_LIMIT_ERROR,
  VERIFY_EMAIL_SUCCESS,
} from '@/features/auth/map-auth-error'
import {
  type AuthFormState,
  firstFieldErrors,
  forgotPasswordSchema,
  formString,
  resetPasswordSchema,
  signinSchema,
  signupSchema,
} from '@/features/auth/schemas'
import { getSession } from '@/features/auth/session'
import { signinFormOpts, signupFormOpts } from './form-opts'

async function saferParse<T>(promise: Promise<T>): Promise<
  | { success: true; data: T }
  // biome-ignore lint/suspicious/noExplicitAny: fine here, not reading typed value
  | { success: false; error: ServerFormState<any, any> }
> {
  try {
    return { success: true, data: await promise }
  } catch (error) {
    if (error instanceof ServerValidateError)
      return { success: false, error: error.formState }
    throw error
  }
}

const signInServerValidate = createServerValidate({
  ...signinFormOpts,
  onServerValidate: signinSchema,
})

export async function signInEmail(_prev: unknown, formData: FormData) {
  const parsed = await saferParse(signInServerValidate(formData))

  if (!parsed.success) return parsed.error

  try {
    await auth.api.signInEmail({
      headers: await headers(),
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
    })
  } catch (error) {
    const errorMessage = mapLoginErrorMessage(error)

    return {
      values: {
        ...parsed.data,
        password: '',
      },
      errorMap: { onServer: errorMessage },
      errors: [errorMessage],
    }
  }

  redirect('/')
}

const signUpServerValidate = createServerValidate({
  ...signupFormOpts,
  onServerValidate: signupSchema,
})

export async function signUpEmail(_prev: unknown, formData: FormData) {
  const parsed = await saferParse(signUpServerValidate(formData))

  if (!parsed.success) return parsed.error

  try {
    await auth.api.signUpEmail({
      headers: await headers(),
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        callbackURL: '/',
      },
    })
  } catch (error) {
    const errorMessage = mapSignupErrorMessage(error)

    return {
      values: {
        ...parsed.data,
        password: '',
      },
      errorMap: { onServer: errorMessage },
      errors: [errorMessage],
    }
  }

  redirect('/verify-email')
}

export async function signInSocial(formData: FormData) {
  const provider = formString(formData, 'provider')
  const enabled = enabledSocialProviders()

  if (provider !== 'github' && provider !== 'google') {
    redirect('/login' as Route)
  }

  if (!enabled.includes(provider)) {
    redirect('/login' as Route)
  }

  let destination: string | undefined

  try {
    const result = await auth.api.signInSocial({
      body: {
        provider,
        callbackURL: '/',
        errorCallbackURL: '/login',
      },
      headers: await headers(),
    })
    destination = result.url
  } catch {
    redirect('/login' as Route)
  }

  if (destination) {
    redirect(destination as Route)
  }

  redirect('/login' as Route)
}

export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formString(formData, 'email'),
  })

  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) }
  }

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: '/reset-password',
      },
      headers: await headers(),
    })
  } catch (error) {
    if (isRateLimited(error)) {
      return { error: RATE_LIMIT_ERROR }
    }
  }

  return { success: FORGOT_PASSWORD_SUCCESS }
}

export async function resetPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formString(formData, 'token'),
    password: formString(formData, 'password'),
    confirmPassword: formString(formData, 'confirmPassword'),
  })

  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) }
  }

  try {
    await auth.api.resetPassword({
      body: {
        newPassword: parsed.data.password,
        token: parsed.data.token,
      },
      headers: await headers(),
    })
  } catch (error) {
    return mapResetPasswordError(error)
  }

  redirect('/login' as Route)
}

export async function resendVerificationEmail(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const session = await getSession()
  const email = session?.user.email ?? formString(formData, 'email')
  const parsed = forgotPasswordSchema.safeParse({ email })

  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) }
  }

  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: parsed.data.email,
        callbackURL: '/',
      },
      headers: await headers(),
    })
  } catch (error) {
    if (isRateLimited(error)) {
      return { error: RATE_LIMIT_ERROR }
    }

    return mapVerificationError(error)
  }

  return { success: VERIFY_EMAIL_SUCCESS }
}
