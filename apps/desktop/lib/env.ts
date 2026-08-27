import { z } from 'zod/v4'

const schema = z.object({
  GEMINI_API_KEY: z.string().min(1).optional(),
})

export const env = schema.parse({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || undefined,
})
