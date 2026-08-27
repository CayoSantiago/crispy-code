import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { AppRouter } from '@/lib/orpc/router'

declare global {
  // Used by Optimize SSR dual-client bridge (see client.server.ts).
  var $client: RouterClient<AppRouter> | undefined
}

const link = new RPCLink({
  url: () => {
    if (typeof window === 'undefined') {
      throw new Error('RPCLink is not allowed on the server side.')
    }

    return `${window.location.origin}/rpc`
  },
})

function getClient(): RouterClient<AppRouter> {
  return globalThis.$client ?? createORPCClient(link)
}

/**
 * Prefer the in-process server client during SSR; fall back to RPCLink in the browser.
 * Lazy so module init order vs `client.server` does not pin a broken link client.
 */
export const client: RouterClient<AppRouter> = new Proxy(
  {} as RouterClient<AppRouter>,
  {
    get(_target, property, receiver) {
      return Reflect.get(getClient(), property, receiver)
    },
  },
)

export const orpc = createTanstackQueryUtils(client)
