import 'server-only'

import { env } from '@repo/env/server'
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'crispy-code',
  env: env.CONTEXT && env.CONTEXT !== 'production' ? env.BRANCH : undefined,
  checkpointing: { maxRuntime: '8s' },
})
