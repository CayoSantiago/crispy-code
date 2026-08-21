import { createEnv } from '@t3-oss/env-core'
import { netlify } from '@t3-oss/env-core/presets-zod'
import { z } from 'zod/v4'

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),

    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),

    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  extends: [netlify()],
})
