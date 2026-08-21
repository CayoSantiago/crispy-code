import 'server-only'

import { eventType, Inngest } from 'inngest'
import { emailSendPayloadSchema } from '#schema'

export const emailSend = eventType('email/send', {
  schema: emailSendPayloadSchema,
})

export const inngest = new Inngest({
  id: 'crispy-code',
  env:
    process.env.CONTEXT && process.env.CONTEXT !== 'production'
      ? process.env.BRANCH
      : undefined,
  checkpointing: { maxRuntime: '8s' },
})
