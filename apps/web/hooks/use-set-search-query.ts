import { useCallback, useTransition } from 'react'

export function useSetSearchQuery(queryKey: string) {
  const [, startTransition] = useTransition()

  return useCallback(
    (val: string | null) => {
      if (typeof window === 'undefined') return

      const newSearch = new URLSearchParams(location.search)

      if (decodeURIComponent(newSearch.get(queryKey) ?? '') === val) return

      if (val) newSearch.set(queryKey, encodeURIComponent(val))
      else newSearch.delete(queryKey)

      startTransition(() =>
        history.replaceState(null, '', `?${newSearch.toString()}`),
      )
    },
    [queryKey],
  )
}
