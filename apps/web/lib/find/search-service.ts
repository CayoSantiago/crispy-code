import {
  addRecentSearches,
  readFindConfig,
  updateFindConfig,
} from '@/lib/find/config'
import {
  getSearchSources,
  groupMatchesByProject,
  type SearchOptions,
  searchAcrossSources,
} from '@/lib/find/search'
import type { SearchResponse } from '@/lib/find/search-schema'

export type { SearchResponse }

export async function executeSearch(
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const config = await readFindConfig()
  const sourceSet = await getSearchSources(config)
  const matches = await searchAcrossSources(
    sourceSet.available,
    options,
    signal,
  )
  const grouped = groupMatchesByProject(matches)

  if (signal?.aborted) {
    return {
      groups: grouped,
      totalMatches: matches.length,
      missingSources: sourceSet.missing.map((source) => ({
        id: source.id,
        label: source.label,
      })),
      sourceOptions: sourceSet.available.map((source) => ({
        id: source.id,
        label: source.label,
      })),
      recentSearches: config.recentSearches,
    }
  }

  const updated = await updateFindConfig((current) => ({
    ...current,
    recentSearches: addRecentSearches(current.recentSearches, options.query),
  }))

  return {
    groups: grouped,
    totalMatches: matches.length,
    missingSources: sourceSet.missing.map((source) => ({
      id: source.id,
      label: source.label,
    })),
    sourceOptions: sourceSet.available.map((source) => ({
      id: source.id,
      label: source.label,
    })),
    recentSearches: updated.recentSearches,
  }
}
