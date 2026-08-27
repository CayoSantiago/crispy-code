export async function settleSourceSearches<TSource, TResult>(
  sources: TSource[],
  search: (source: TSource) => Promise<TResult>,
): Promise<{ results: TResult[]; unavailable: TSource[] }> {
  const settled = await Promise.all(
    sources.map(async (source) => {
      try {
        return { source, result: await search(source) }
      } catch {
        return { source }
      }
    }),
  )

  const results: TResult[] = []
  const unavailable: TSource[] = []

  for (const item of settled) {
    if ('result' in item) {
      results.push(item.result as TResult)
    } else {
      unavailable.push(item.source)
    }
  }

  return { results, unavailable }
}
