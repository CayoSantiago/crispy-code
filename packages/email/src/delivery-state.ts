import { EmailDeliveryStatus } from '#schema'

export function isAlreadySent(
  existing: {
    status: EmailDeliveryStatus
    providerMessageId: string | null
  } | null,
) {
  if (!existing) return false
  return existing.status === 'SENT' || Boolean(existing.providerMessageId)
}
