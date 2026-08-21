import 'server-only'

import { serve } from 'inngest/next'
import { inngest } from '#inngest/client'
import { sendEmailFn } from '#inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendEmailFn],
})
