import 'server-only'

import { env } from '@repo/env/server'
import { inngest } from '@repo/jobs/client'
import { createLogger } from '@repo/observability/logger'
import { upsertQueued } from '#delivery'
import { emailSend } from '#inngest/client'
import { type EmailSendPayload, emailSendPayloadSchema } from '#schema'
import { isEmailSendingEnabled } from '#sending-enabled'
import { assertAllowedEmailUrl } from '#urls'

const log = createLogger('email')

export async function enqueueEmail(input: EmailSendPayload) {
  const payload = emailSendPayloadSchema.parse(input)
  assertAllowedEmailUrl(payload.props.url, env.BETTER_AUTH_URL)

  const fields = {
    type: payload.type,
    to: payload.to,
    idempotencyKey: payload.idempotencyKey,
  }

  if (!isEmailSendingEnabled(env.CONTEXT)) {
    log.info('email.enqueue.skipped', {
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
    log.error('email.enqueue.failed', {
      ...fields,
      reason: error instanceof Error ? error.message : 'unknown',
    })
    throw error
  }

  log.info('email.enqueue.queued', fields)
}
