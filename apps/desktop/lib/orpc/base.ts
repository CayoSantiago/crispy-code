import { os } from '@orpc/server'
import { z } from 'zod/v4'
import { isDesktopRequestAuthorized } from '@/lib/desktop-token'
import type { OrpcContext } from '@/lib/orpc/context'

export const base = os
  .$context<OrpcContext>()
  .errors({
    BAD_REQUEST: {},
    FORBIDDEN: {},
    NOT_FOUND: {},
    RATE_LIMITED: {
      data: z.object({
        resetAt: z.nullable(z.string()),
      }),
    },
    INTERNAL_SERVER_ERROR: {},
  })
  .use(({ context, next, errors }) => {
    if (
      context.headers.get('sec-fetch-site') === 'cross-site' ||
      !isDesktopRequestAuthorized(context.headers)
    ) {
      throw errors.FORBIDDEN({
        message: 'This request is not authorized for the desktop server.',
      })
    }

    return next()
  })
