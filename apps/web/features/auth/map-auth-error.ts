import { isAPIError } from 'better-auth/api'
import type { AuthFormState } from '@/features/auth/schemas'

export const GENERIC_AUTH_ERROR = 'Something went wrong. Try again.'
export const INVALID_CREDENTIALS_ERROR = 'Invalid email or password'
export const RATE_LIMIT_ERROR = 'Too many attempts. Try again in a few minutes.'
export const DUPLICATE_EMAIL_ERROR =
  'An account with this email already exists.'
export const FORGOT_PASSWORD_SUCCESS =
  'If an account exists for that email, we sent a reset link.'
export const VERIFY_EMAIL_SUCCESS =
  'If that email needs verification, we sent a new link.'

const CREDENTIAL_CODES = new Set([
  'INVALID_EMAIL_OR_PASSWORD',
  'INVALID_PASSWORD',
  'INVALID_EMAIL',
  'USER_NOT_FOUND',
  'INVALID_USER',
  'CREDENTIAL_ACCOUNT_NOT_FOUND',
])

const DUPLICATE_EMAIL_CODES = new Set([
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
])

const INVALID_TOKEN_CODES = new Set(['INVALID_TOKEN', 'TOKEN_EXPIRED'])

function authErrorCode(error: unknown): string | undefined {
  if (!isAPIError(error)) {
    return undefined
  }

  const body = error.body
  if (body && typeof body === 'object' && 'code' in body) {
    const code = body.code
    if (typeof code === 'string') {
      return code
    }
  }

  return undefined
}

export function isRateLimited(error: unknown) {
  if (!isAPIError(error)) {
    return false
  }

  return (
    error.statusCode === 429 || authErrorCode(error) === 'TOO_MANY_REQUESTS'
  )
}

export function mapLoginErrorMessage(error: unknown) {
  if (isRateLimited(error)) {
    return RATE_LIMIT_ERROR
  }

  const code = authErrorCode(error)
  if (code && CREDENTIAL_CODES.has(code)) {
    return INVALID_CREDENTIALS_ERROR
  }

  if (code === 'EMAIL_NOT_VERIFIED') {
    return 'Verify your email to continue. Check your inbox for a link.'
  }

  return GENERIC_AUTH_ERROR
}

export function mapSignupErrorMessage(error: unknown) {
  if (isRateLimited(error)) {
    return RATE_LIMIT_ERROR
  }

  const code = authErrorCode(error)
  if (code && DUPLICATE_EMAIL_CODES.has(code)) {
    return DUPLICATE_EMAIL_ERROR
  }

  if (code === 'PASSWORD_TOO_SHORT') {
    return 'Must be at least 8 characters long.'
  }

  return GENERIC_AUTH_ERROR
}

export function mapResetPasswordError(error: unknown): AuthFormState {
  if (isRateLimited(error)) {
    return { error: RATE_LIMIT_ERROR }
  }

  const code = authErrorCode(error)
  if (code && INVALID_TOKEN_CODES.has(code)) {
    return { error: 'This reset link is invalid or has expired.' }
  }

  if (code === 'PASSWORD_TOO_SHORT') {
    return {
      fieldErrors: { password: 'Must be at least 8 characters long.' },
    }
  }

  return { error: GENERIC_AUTH_ERROR }
}

export function mapVerificationError(error: unknown): AuthFormState {
  if (isRateLimited(error)) {
    return { error: RATE_LIMIT_ERROR }
  }

  return { error: GENERIC_AUTH_ERROR }
}
