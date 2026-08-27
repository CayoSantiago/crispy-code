import type { PlannedSearch } from '@/features/ask/schemas'
import {
  loadLocalSources,
  runLocalSearches,
} from '@/features/find/local-search'
import { registerTool } from '@/features/harness/tools'

let registered = false

export function registerFindTools(): void {
  if (registered) return
  registered = true

  registerTool({
    name: 'search_local',
    description: 'Run planned ripgrep searches over configured local folders',
    async execute(input: { searches: PlannedSearch[] }) {
      const sources = await loadLocalSources()
      if (!sources.available.length) {
        return { groups: [], missing: sources.missing, empty: true as const }
      }

      const search = await runLocalSearches(sources.available, input.searches)
      return {
        groups: search.groups,
        missing: [...sources.missing, ...search.unavailable],
        empty: false as const,
      }
    },
  })
}
