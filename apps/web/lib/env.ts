import { z } from 'zod'

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed?.length ? trimmed : undefined
  })

const requiredString = z.string().trim().min(1)

const envSchema = z.object({
  DATABASE_URL: optionalString,
  GITHUB_TOKEN: optionalString,
  BETTER_AUTH_SECRET: requiredString.min(32),
  BETTER_AUTH_URL: z.string().trim().url(),
  GITHUB_CLIENT_ID: optionalString,
  GITHUB_CLIENT_SECRET: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
})

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
})
