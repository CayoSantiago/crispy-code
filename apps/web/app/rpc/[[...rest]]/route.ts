import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { auth } from '@repo/auth/server'
import type { OrpcContext } from '@/lib/orpc/context'
import { appRouter } from '@/lib/orpc/router'

const handler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

async function getAuthContext(headers: Headers) {
  try {
    const result = await auth.api.getSession({ headers })
    return {
      session: result?.session ?? null,
      user: result?.user ?? null,
    }
  } catch {
    return { session: null, user: null }
  }
}

async function handleRequest(request: Request) {
  const { session, user } = await getAuthContext(request.headers)
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {
      headers: request.headers,
      session,
      user,
    } satisfies OrpcContext,
  })

  return response ?? new Response('Not found', { status: 404 })
}

export const HEAD = handleRequest
export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const PATCH = handleRequest
export const DELETE = handleRequest
