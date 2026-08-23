import 'server-only'

import { eventType } from 'inngest'
import { emailSendPayloadSchema } from '#schema'

export const emailSend = eventType('email/send', {
  schema: emailSendPayloadSchema,
})
