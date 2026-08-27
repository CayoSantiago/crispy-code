import { emailFunctions } from '@repo/email/functions'
import { inngest } from '@repo/jobs/client'
import { serve } from 'inngest/next'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [...emailFunctions],
})
