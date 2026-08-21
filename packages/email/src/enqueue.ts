import 'server-only'

import { upsertQueued } from '#delivery'
import { emailSend, inngest } from '#inngest/client'
import { type EmailSendPayload, emailSendPayloadSchema } from '#schema'

export async function enqueueEmail(input: EmailSendPayload) {
  const payload = emailSendPayloadSchema.parse(input)

  await upsertQueued(payload)

  await inngest.send(emailSend.create(payload, { id: payload.idempotencyKey }))
}
