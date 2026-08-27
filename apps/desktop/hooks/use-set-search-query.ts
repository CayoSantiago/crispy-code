import { useCallback, useTransition } from 'react'

export function useSetSearchQuery(queryKey: string) {
  const [, startTransition] = useTransition()

  return useCallback(
    (value: string | null) => {
      if (typeof window === 'undefined') return

      const search = new URLSearchParams(location.search)
      if (decodeURIComponent(search.get(queryKey) ?? '') === value) return

      if (value) search.set(queryKey, encodeURIComponent(value))
      else search.delete(queryKey)

      startTransition(() =>
        history.replaceState(null, '', `?${search.toString()}`),
      )
    },
    [queryKey],
  )
}
