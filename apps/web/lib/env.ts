import { z } from 'zod'

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed?.length ? trimmed : undefined
  })

const envSchema = z.object({
  DATABASE_URL: optionalString,
  GITHUB_TOKEN: optionalString,
})

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
})
