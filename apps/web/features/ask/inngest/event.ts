import 'server-only'

import { eventType } from 'inngest'
import { z } from 'zod'
import { askHistoryTurnSchema } from '@/features/ask/schemas'

export const askRunPayloadSchema = z.object({
  threadId: z.string().min(1),
  turnId: z.string().min(1),
  question: z.string().min(1),
  history: z.array(askHistoryTurnSchema),
})

export const askRun = eventType('ask/run', {
  schema: askRunPayloadSchema,
})
