'use server'

import { enabledSocialProviders } from '@repo/auth/config'
import { auth } from '@repo/auth/server'
import {
  createServerValidate,
  ServerValidateError,
} from '@tanstack/react-form-nextjs'
import type { Route } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  forgotPasswordFormOpts,
  resetPasswordFormOpts,
  signinFormOpts,
  signupFormOpts,
  verifyEmailFormOpts,
} from '@/features/auth/form-opts'
import {
  createErrorResponse,
  createSuccessResponse,
  type ServerActionResponse,
} from '@/features/auth/helpers'
import {
  FORGOT_PASSWORD_SUCCESS,
  isRateLimited,
  mapLoginErrorMessage,
  mapResetPasswordErrorMessage,
  mapSignupErrorMessage,
  mapVerificationErrorMessage,
  RATE_LIMIT_ERROR,
  VERIFY_EMAIL_SUCCESS,
} from '@/features/auth/map-auth-error'
import {
  forgotPasswordSchema,
  formString,
  resetPasswordSchema,
  signinSchema,
  signupSchema,
} from '@/features/auth/schemas'
import { getSession } from '@/features/auth/session'
import { type Option, tryCatch } from '@/lib/helpers'

async function saferParse<T>(
  promise: Promise<T>,
): Promise<Option<T, ServerActionResponse>> {
  const res = await tryCatch(promise)
  if (res.success) return res
  if (res.error instanceof ServerValidateError) {
    return { success: false, error: res.error.formState }
  }
  throw res.error
}

const signInServerValidate = createServerValidate({
  ...signinFormOpts,
  onServerValidate: signinSchema,
})

export async function signInEmail(_prev: unknown, formData: FormData) {
  const parsed = await saferParse(signInServerValidate(formData))

  if (!parsed.success) return parsed.error

  try {
    await auth.api.signInEmail({ headers: await headers(), body: parsed.data })
  } catch (error) {
    return createErrorResponse({
      values: { ...parsed.data, password: '' },
      message: mapLoginErrorMessage(error),
    })
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
    return createErrorResponse({
      values: { ...parsed.data, password: '' },
      message: mapSignupErrorMessage(error),
    })
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

const requestPasswordResetValidate = createServerValidate({
  ...forgotPasswordFormOpts,
  onServerValidate: forgotPasswordSchema,
})

export async function requestPasswordReset(_prev: unknown, formData: FormData) {
  const parsed = await saferParse(requestPasswordResetValidate(formData))

  if (!parsed.success) return parsed.error

  try {
    await auth.api.requestPasswordReset({
      headers: await headers(),
      body: {
        email: parsed.data.email,
        redirectTo: '/reset-password',
      },
    })
  } catch (error) {
    if (isRateLimited(error)) {
      return createErrorResponse({
        values: parsed.data,
        message: RATE_LIMIT_ERROR,
      })
    }
  }

  return createSuccessResponse({
    values: parsed.data,
    message: FORGOT_PASSWORD_SUCCESS,
  })
}

const resetPasswordValidate = createServerValidate({
  ...resetPasswordFormOpts,
  onServerValidate: resetPasswordSchema,
})

export async function resetPassword(_prev: unknown, formData: FormData) {
  const parsed = await saferParse(resetPasswordValidate(formData))

  if (!parsed.success) return parsed.error

  try {
    await auth.api.resetPassword({
      body: {
        newPassword: parsed.data.password,
        token: parsed.data.token,
      },
      headers: await headers(),
    })
  } catch (error) {
    return createErrorResponse({
      values: {
        ...parsed.data,
        password: '',
        confirmPassword: '',
      },
      message: mapResetPasswordErrorMessage(error),
    })
  }

  redirect('/login' as Route)
}

const resendVerificationEmailValidate = createServerValidate({
  ...verifyEmailFormOpts,
  onServerValidate: forgotPasswordSchema,
})

export async function resendVerificationEmail(
  _prev: unknown,
  formData: FormData,
) {
  const parsed = await saferParse(resendVerificationEmailValidate(formData))

  if (!parsed.success) return parsed.error

  const email = (await getSession())?.user.email ?? parsed.data.email

  try {
    await auth.api.sendVerificationEmail({
      headers: await headers(),
      body: { email, callbackURL: '/' },
    })
  } catch (error) {
    const errorMessage = isRateLimited(error)
      ? RATE_LIMIT_ERROR
      : mapVerificationErrorMessage(error)

    return createErrorResponse({ values: { email }, message: errorMessage })
  }

  return createSuccessResponse({
    values: { email },
    message: VERIFY_EMAIL_SUCCESS,
  })
}
