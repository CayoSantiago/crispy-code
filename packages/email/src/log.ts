export type EmailLogger = {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

export type EmailLogFields = {
  type?: string
  to?: string
  idempotencyKey?: string
  skipped?: boolean
  reason?: string
  providerMessageId?: string
  sent?: number
  queued?: number
  failed?: number
}

export function logEmail(
  logger: EmailLogger,
  level: keyof EmailLogger,
  event: string,
  fields?: EmailLogFields,
) {
  logger[level](JSON.stringify({ event, ...fields }))
}
