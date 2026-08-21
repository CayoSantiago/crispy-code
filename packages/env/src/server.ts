import { createEnv } from '@t3-oss/env-core'
import { netlify } from '@t3-oss/env-core/presets-zod'
import { z } from 'zod/v4'

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    DATABASE_URL_UNPOOLED: z.optional(z.url()),

    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),

    GOOGLE_CLIENT_ID: z.optional(z.string().min(1)),
    GOOGLE_CLIENT_SECRET: z.optional(z.string().min(1)),

    GITHUB_CLIENT_ID: z.optional(z.string().min(1)),
    GITHUB_CLIENT_SECRET: z.optional(z.string().min(1)),

    GITHUB_TOKEN: z.optional(z.string().min(1)),

    NEON_API_KEY: z.optional(z.string().min(1)),
    NEON_PROJECT_ID: z.optional(z.string().min(1)),

    REVIEW_ID: z.optional(z.string().min(1)),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  extends: [netlify()],
})
