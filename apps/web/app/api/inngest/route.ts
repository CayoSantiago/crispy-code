import { emailFunctions } from '@repo/email/functions'
import { inngest } from '@repo/jobs/client'
import { serve } from 'inngest/next'
import { askRunFn } from '@/features/ask/inngest/function'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [...emailFunctions, askRunFn],
})
