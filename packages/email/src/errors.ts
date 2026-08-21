import { NonRetriableError, RetryAfterError } from 'inngest'

const retryableResendErrors = new Set([
  'application_error',
  'internal_server_error',
  'api_error',
])

export function throwForResendError(error: {
  name: string
  message: string
}): never {
  const message = `${error.name}: ${error.message}`

  if (error.name === 'rate_limit_exceeded') {
    throw new RetryAfterError(message, '60s')
  }

  if (error.name === 'concurrent_idempotent_requests') {
    throw new RetryAfterError(message, '5s')
  }

  if (retryableResendErrors.has(error.name)) {
    throw new Error(message)
  }

  throw new NonRetriableError(message)
}
