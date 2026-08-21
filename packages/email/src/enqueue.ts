import 'server-only'

import { env } from '@repo/env/server'
import { upsertQueued } from '#delivery'
import { emailSend, inngest } from '#inngest/client'
import { logEmail } from '#log'
import { type EmailSendPayload, emailSendPayloadSchema } from '#schema'
import { isEmailSendingEnabled } from '#sending-enabled'
import { assertAllowedEmailUrl } from '#urls'

export async function enqueueEmail(input: EmailSendPayload) {
  const payload = emailSendPayloadSchema.parse(input)
  assertAllowedEmailUrl(payload.props.url, env.BETTER_AUTH_URL)

  const fields = {
    type: payload.type,
    to: payload.to,
    idempotencyKey: payload.idempotencyKey,
  }

  if (!isEmailSendingEnabled(env.CONTEXT)) {
    logEmail(console, 'info', 'email.enqueue.skipped', {
      ...fields,
      skipped: true,
      reason: 'preview',
    })
    return
  }

  await upsertQueued(payload)
  try {
    await inngest.send(
      emailSend.create(payload, { id: payload.idempotencyKey }),
    )
  } catch (error) {
    logEmail(console, 'error', 'email.enqueue.failed', {
      ...fields,
      reason: error instanceof Error ? error.message : 'unknown',
    })
    throw error
  }
  logEmail(console, 'info', 'email.enqueue.queued', fields)
}
