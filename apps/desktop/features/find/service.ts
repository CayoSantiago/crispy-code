import { buildSearchGroups } from '@/features/find/cluster-search-lines'
import { readFindConfig } from '@/features/find/config/service'
import type { SearchResponse } from '@/features/find/schemas'
import {
  getSearchSources,
  type SearchOptions,
  searchAcrossSources,
} from '@/features/find/search'

export type { SearchResponse }

export async function executeSearch(
  options: SearchOptions,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const config = await readFindConfig()
  const sourceSet = await getSearchSources(config)
  const searchResult = await searchAcrossSources(
    sourceSet.available,
    options,
    signal,
  )
  const groups = buildSearchGroups(searchResult.events)
  const totalMatches = groups.reduce((sum, group) => sum + group.matchCount, 0)
  const missingSources = [...sourceSet.missing, ...searchResult.unavailable]

  return {
    groups,
    totalMatches,
    missingSources: missingSources.map((source) => ({
      id: source.id,
      label: source.label,
    })),
  }
}
