import { createEnv } from '@t3-oss/env-core'
import { netlify } from '@t3-oss/env-core/presets-zod'
import { z } from 'zod/v4'

const isNetlifyProduction = process.env.CONTEXT === 'production'

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

    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: isNetlifyProduction
      ? z.string().min(1)
      : z.string().min(1).default('Crispy Code <onboarding@resend.dev>'),

    INNGEST_EVENT_KEY: isNetlifyProduction
      ? z.string().min(1)
      : z.optional(z.string().min(1)),
    INNGEST_SIGNING_KEY: isNetlifyProduction
      ? z.string().min(1)
      : z.optional(z.string().min(1)),
    INNGEST_DEV: z
      .enum(['0', '1'])
      .optional()
      .refine(
        (value) => !(isNetlifyProduction && value === '1'),
        'INNGEST_DEV must not be enabled in production',
      ),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  extends: [netlify()],
})
