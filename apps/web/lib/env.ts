import { z } from 'zod'

const optionalToken = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed?.length ? trimmed : undefined
  })

const envSchema = z.object({
  GITHUB_TOKEN: optionalToken,
})

export const env = envSchema.parse({
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
})
