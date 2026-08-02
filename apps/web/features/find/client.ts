import {
  type SearchResponse,
  searchResponseSchema,
} from '@/features/find/schemas'
import type { SearchOptions } from '@/features/find/search'

export type { SearchResponse }

export async function fetchSearchResults(
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    query: options.query,
    mode: options.mode,
    caseSensitive: String(options.caseSensitive),
    wholeWord: String(options.wholeWord),
    extension: options.extension,
    pathFilter: options.pathFilter,
    sourceFilter: options.sourceFilter,
  })

  const response = await fetch(`/api/find/search?${params.toString()}`, {
    signal,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(
      body?.error ?? `Search failed with status ${response.status}.`,
    )
  }

  const parsed = searchResponseSchema.safeParse(await response.json())

  if (!parsed.success) {
    throw new Error('Search response did not match the expected shape.')
  }

  return parsed.data
}
