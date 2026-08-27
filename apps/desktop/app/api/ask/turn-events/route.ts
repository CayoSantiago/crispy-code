import { subscribeTurnEvents } from '@/features/harness/events'
import { isDesktopRequestAuthorized } from '@/lib/desktop-token'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!isDesktopRequestAuthorized(request.headers)) {
    return new Response('Forbidden', { status: 403 })
  }

  const turnId = new URL(request.url).searchParams.get('turnId')
  if (!turnId) {
    return new Response('turnId required', { status: 400 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      let closed = false
      let unsubscribe = () => {
        // Assigned immediately after the close callback is created.
      }

      const close = () => {
        if (closed) return
        closed = true
        unsubscribe()
        controller.close()
      }
      const send = (event: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      unsubscribe = subscribeTurnEvents(turnId, (event) => {
        send(event)
        if (event.type === 'done' || event.type === 'error') {
          close()
        }
      })
      request.signal.addEventListener('abort', close, { once: true })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
