import 'server-only'

import { auth } from '@repo/auth/server'
import { headers } from 'next/headers'
import { cache } from 'react'

export const getSession = cache(async () => {
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch {
    return null
  }
})
