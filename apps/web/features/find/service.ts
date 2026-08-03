import { readFindConfig } from '@/features/find/config/service'
import type { SearchResponse } from '@/features/find/schemas'
import {
  getSearchSources,
  groupMatchesByProject,
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
  const matches = await searchAcrossSources(
    sourceSet.available,
    options,
    signal,
  )
  const grouped = groupMatchesByProject(matches)

  return {
    groups: grouped,
    totalMatches: matches.length,
    missingSources: sourceSet.missing.map((source) => ({
      id: source.id,
      label: source.label,
    })),
  }
}
