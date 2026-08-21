import { createHash } from 'node:crypto'
import { z } from 'zod/v4'

export const EMAIL_TYPES = ['password-reset', 'email-verification'] as const
export type EmailType = (typeof EMAIL_TYPES)[number]

export const EMAIL_DELIVERY_STATUSES = ['QUEUED', 'SENT', 'FAILED'] as const
export const emailDeliveryStatus = z.literal(EMAIL_DELIVERY_STATUSES)
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number]

const linkEmailPropsSchema = z.object({
  name: z.string().min(1),
  url: z.url(),
})

export const emailSendPayloadSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('password-reset'),
    to: z.email(),
    idempotencyKey: z.string().min(1).max(256),
    props: linkEmailPropsSchema,
  }),
  z.object({
    type: z.literal('email-verification'),
    to: z.email(),
    idempotencyKey: z.string().min(1).max(256),
    props: linkEmailPropsSchema,
  }),
])

export type EmailSendPayload = z.infer<typeof emailSendPayloadSchema>

export function emailIdempotencyKey(type: EmailType, token: string) {
  const digest = createHash('sha256').update(token).digest('hex')
  return `${type}/${digest}`
}
