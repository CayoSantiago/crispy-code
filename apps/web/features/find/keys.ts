import type { SearchOptions } from '@/features/find/search'

export const findKeys = {
  all: ['find'] as const,
  config: () => [...findKeys.all, 'config'] as const,
  searches: () => [...findKeys.all, 'search'] as const,
  search: (params: SearchOptions) => [...findKeys.searches(), params] as const,
}
