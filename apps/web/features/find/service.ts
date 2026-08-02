import {
  readFindConfig,
  updateFindConfig,
} from '@/features/find/config/service'
import type { SearchResponse } from '@/features/find/schemas'
import {
  getSearchSources,
  groupMatchesByProject,
  type SearchOptions,
  searchAcrossSources,
} from '@/features/find/search'
import { MAX_RECENT_SEARCHES } from './config/schemas'

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

function addRecentSearches(existing: string[], query: string): string[] {
  const trimmed = query.trim()

  if (!trimmed) {
    return existing
  }

  return [trimmed, ...existing.filter((value) => value !== trimmed)].slice(
    0,
    MAX_RECENT_SEARCHES,
  )
}
