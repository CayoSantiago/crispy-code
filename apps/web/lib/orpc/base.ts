import { os } from '@orpc/server'
import { z } from 'zod'
import type { OrpcContext } from '@/lib/orpc/context'

export const base = os
  .$context<OrpcContext>()
  .errors({
    BAD_REQUEST: {},
    FORBIDDEN: {},
    NOT_FOUND: {},
    RATE_LIMITED: {
      data: z.object({
        resetAt: z.string().nullable(),
      }),
    },
    INTERNAL_SERVER_ERROR: {},
  })
  .use(({ context, next, errors }) => {
    if (context.headers.get('sec-fetch-site') === 'cross-site') {
      throw errors.FORBIDDEN({
        message: 'Cross-site requests are not allowed.',
      })
    }

    return next()
  })
