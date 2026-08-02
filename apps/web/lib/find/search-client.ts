import type { SearchOptions } from '@/lib/find/search'
import type { SearchResponse } from '@/lib/find/search-service'

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

  return response.json() as Promise<SearchResponse>
}
