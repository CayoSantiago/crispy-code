import 'server-only'

import { markFailed, markSent, upsertQueued } from '#delivery'
import { emailSend, inngest } from '#inngest/client'
import { sendEmail } from '#send'

export const sendEmailFn = inngest.createFunction(
  {
    id: 'email-send',
    retries: 5,
    throttle: { limit: 10, period: '1s' },
    triggers: [emailSend],
    onFailure: async ({ event, error }) => {
      const original = event.data.event
      const idempotencyKey = original.data?.idempotencyKey
      if (typeof idempotencyKey !== 'string') {
        return
      }

      await markFailed(idempotencyKey, error.message)
    },
  },
  async ({ event, step }) => {
    const payload = event.data

    await step.run('record-queued', async () => {
      await upsertQueued(payload)
    })

    const result = await step.run('send', async () => {
      return sendEmail(payload)
    })

    await step.run('record-result', async () => {
      await markSent(payload.idempotencyKey, result.providerMessageId)
    })

    return result
  },
)
