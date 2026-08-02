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

export type SearchResponse = {
  groups: ReturnType<typeof groupMatchesByProject>
  totalMatches: number
  missingSources: Array<{ id: string; label: string }>
  sourceOptions: Array<{ id: string; label: string }>
  recentSearches: string[]
}

export async function executeSearch(
  options: SearchOptions,
): Promise<SearchResponse> {
  const config = await readFindConfig()
  const sourceSet = await getSearchSources(config)
  const matches = await searchAcrossSources(sourceSet.available, options)
  const grouped = groupMatchesByProject(matches)

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
