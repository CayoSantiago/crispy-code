import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { isDesktopRequestAuthorized } from '@/lib/desktop-token'
import type { OrpcContext } from '@/lib/orpc/context'
import { appRouter } from '@/lib/orpc/router'

const handler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error('orpc.unhandled', {
        name: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : String(error),
      })
    }),
  ],
})

async function handleRequest(request: Request) {
  if (!isDesktopRequestAuthorized(request.headers)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {
      headers: request.headers,
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
