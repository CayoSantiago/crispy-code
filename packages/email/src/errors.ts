import { NonRetriableError } from 'inngest'

const retryableResendErrors = new Set([
  'rate_limit_exceeded',
  'concurrent_idempotent_requests',
  'application_error',
  'internal_server_error',
  'api_error',
])

export function throwForResendError(error: {
  name: string
  message: string
}): never {
  const message = `${error.name}: ${error.message}`

  if (retryableResendErrors.has(error.name)) {
    throw new Error(message)
  }

  throw new NonRetriableError(message)
}
