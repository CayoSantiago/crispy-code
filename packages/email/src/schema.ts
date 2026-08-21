import { z } from 'zod/v4'

export const EMAIL_TYPES = ['password-reset', 'email-verification'] as const
export const emailTypeSchema = z.literal(EMAIL_TYPES)
export type EmailType = (typeof EMAIL_TYPES)[number]

export const emailSendPayloadSchema = z.object({
  type: emailTypeSchema,
  to: z.email(),
  idempotencyKey: z.string().min(1).max(256),
  props: z.object({
    name: z.string().min(1),
    url: z.url(),
  }),
})

export type EmailSendPayload = z.infer<typeof emailSendPayloadSchema>

export function emailIdempotencyKey(type: EmailType, token: string) {
  return `${type}/${token}`
}

export const emailSubjects: Record<EmailType, string> = {
  'password-reset': 'Reset your password',
  'email-verification': 'Verify your email address',
}
