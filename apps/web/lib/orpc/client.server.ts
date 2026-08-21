import 'server-only'

import { createRouterClient } from '@orpc/server'
import { auth } from '@repo/auth/server'
import { headers } from 'next/headers'
import { appRouter } from '@/lib/orpc/router'

globalThis.$client = createRouterClient(appRouter, {
  context: async () => {
    const requestHeaders = await headers()
    try {
      const result = await auth.api.getSession({ headers: requestHeaders })
      return {
        headers: requestHeaders,
        session: result?.session ?? null,
        user: result?.user ?? null,
      }
    } catch {
      return {
        headers: requestHeaders,
        session: null,
        user: null,
      }
    }
  },
})
