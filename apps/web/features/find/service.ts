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
  const events = await searchAcrossSources(sourceSet.available, options, signal)
  const groups = buildSearchGroups(events)
  const totalMatches = groups.reduce((sum, group) => sum + group.matchCount, 0)

  return {
    groups,
    totalMatches,
    missingSources: sourceSet.missing.map((source) => ({
      id: source.id,
      label: source.label,
    })),
  }
}
