import 'server-only'

import { getDelivery, markFailed } from '#delivery'
import { isAlreadySent } from '#delivery-state'
import { emailSend, inngest } from '#inngest/client'
import { logEmail } from '#log'
import { sendEmail } from '#send'

export const sendEmailFn = inngest.createFunction(
  {
    id: 'email-send',
    retries: 5,
    throttle: { limit: 10, period: '1s' },
    concurrency: 10,
    triggers: [emailSend],
    onFailure: async ({ event, error, logger }) => {
      const original = event.data.event
      const idempotencyKey = original.data?.idempotencyKey
      if (typeof idempotencyKey !== 'string') {
        return
      }

      const existing = await getDelivery(idempotencyKey)
      if (isAlreadySent(existing)) {
        logEmail(logger, 'warn', 'email.send.skipped', {
          idempotencyKey,
          skipped: true,
          reason: 'already-sent',
        })
        return
      }

      logEmail(logger, 'error', 'email.send.failed', {
        idempotencyKey,
        reason: error.message,
      })
      await markFailed(idempotencyKey, error.message)
    },
  },
  async ({ event, step, logger }) => {
    return step.run('send', async () => sendEmail(event.data, logger))
  },
)
