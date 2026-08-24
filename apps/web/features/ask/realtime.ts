import { channel } from 'inngest/realtime'
import { z } from 'zod'

export const askTurnTokenSchema = z.object({
  kind: z.enum(['thinking', 'answer']),
  text: z.string(),
})

export const askTurnChannel = channel({
  name: ({ turnId }: { turnId: string }) => `ask/${turnId}`,
  topics: {
    tokens: {
      schema: askTurnTokenSchema,
    },
  },
})
