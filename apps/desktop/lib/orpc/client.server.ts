import 'server-only'

import { createRouterClient } from '@orpc/server'
import { headers } from 'next/headers'
import { appRouter } from '@/lib/orpc/router'

globalThis.$client = createRouterClient(appRouter, {
  context: async () => {
    const requestHeaders = await headers()
    return {
      headers: requestHeaders,
    }
  },
})
