export type SearchEventKind = 'match' | 'context'

export function createSourceMatchBudget(maxMatches: number) {
  const limit = Number.isFinite(maxMatches)
    ? Math.max(0, Math.floor(maxMatches))
    : 0
  let acceptedMatches = 0

  return {
    accept(kind: SearchEventKind): boolean {
      if (acceptedMatches >= limit) return false
      if (kind === 'match') acceptedMatches += 1
      return true
    },
    get reached(): boolean {
      return acceptedMatches >= limit
    },
  }
}
