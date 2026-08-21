import { createEnv } from '@t3-oss/env-nextjs'
import { netlify } from '@t3-oss/env-nextjs/presets-zod'
import { z } from 'zod/v4'

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  emptyStringAsUndefined: true,
  extends: [netlify()],
})
