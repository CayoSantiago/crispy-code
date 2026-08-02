import {
  defaultShouldDehydrateQuery,
  environmentManager,
  MutationCache,
  QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { cache } from 'react'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      invalidatesQuery?: QueryKey
    }
  }
}

export function makeQueryClient() {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSettled: async (_data, _error, _args, _ctx, mutation) => {
        if (mutation.meta?.invalidatesQuery) {
          await queryClient.invalidateQueries({
            queryKey: mutation.meta.invalidatesQuery,
          })
        }
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      dehydrate: {
        // include pending queries in dehydration
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
        shouldRedactErrors: () => {
          // We should not catch Next.js server errors
          // as that's how Next.js detects dynamic pages
          // so we cannot redact them.
          // Next.js also automatically redacts errors for us
          // with better digests.

          return false
        },
      },
    },
  })
  return queryClient
}

let browserQueryClient: QueryClient | undefined

export const getQueryClient = cache(() => {
  if (environmentManager.isServer()) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
})
