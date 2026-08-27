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
        staleTime: 1000 * 60 * 5,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
        shouldRedactErrors: () => false,
      },
    },
  })
  return queryClient
}

let browserQueryClient: QueryClient | undefined

export const getQueryClient = cache(() => {
  if (environmentManager.isServer()) {
    return makeQueryClient()
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
})
