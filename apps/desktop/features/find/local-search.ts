import { capSearchGroups } from '@/features/find/cap-evidence'
import {
  buildSearchGroups,
  type SearchLineEvent,
} from '@/features/find/cluster-search-lines'
import { readFindConfig } from '@/features/find/config/service'
import type { SearchGroup, SearchMode } from '@/features/find/schemas'
import {
  getSearchSources,
  type SearchSource,
  searchAcrossSources,
} from '@/features/find/search'

export type PlannedLocalSearch = {
  query: string
  pathGlob: string
  mode: SearchMode
}

export async function loadLocalSources(): Promise<{
  available: SearchSource[]
  missing: Array<{ id: string; label: string }>
}> {
  const config = await readFindConfig()
  const sourceSet = await getSearchSources(config)
  return {
    available: sourceSet.available,
    missing: sourceSet.missing.map((source) => ({
      id: source.id,
      label: source.label,
    })),
  }
}

export async function runLocalSearches(
  sources: SearchSource[],
  searches: PlannedLocalSearch[],
): Promise<SearchGroup[]> {
  const events: SearchLineEvent[] = []
  const seen = new Set<string>()

  for (const search of searches.slice(0, 3)) {
    const batch = await searchAcrossSources(sources, {
      query: search.query,
      mode: search.mode,
      caseSensitive: false,
      pathGlob: search.pathGlob,
      maxResultsPerSource: 50,
    })

    for (const event of batch) {
      const key = `${event.absolutePath}:${event.lineNumber}:${event.kind}`
      if (seen.has(key)) continue
      seen.add(key)
      events.push(event)
    }
  }

  return capSearchGroups(buildSearchGroups(events))
}

export function totalMatchCount(groups: SearchGroup[]): number {
  return groups.reduce((sum, group) => sum + group.matchCount, 0)
}
