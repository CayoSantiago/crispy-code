import 'server-only'

import { env } from '@repo/env/server'
import { eventType, Inngest } from 'inngest'
import { emailSendPayloadSchema } from '#schema'

export const emailSend = eventType('email/send', {
  schema: emailSendPayloadSchema,
})

export const inngest = new Inngest({
  id: 'crispy-code',
  env: env.CONTEXT && env.CONTEXT !== 'production' ? env.BRANCH : undefined,
  checkpointing: { maxRuntime: '8s' },
})
