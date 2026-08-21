import 'server-only'

import { serve } from 'inngest/next'
import { inngest } from '#inngest/client'
import { sendEmailFn } from '#inngest/functions'
import { pruneEmailDeliveriesFn } from '#inngest/prune'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendEmailFn, pruneEmailDeliveriesFn],
})
