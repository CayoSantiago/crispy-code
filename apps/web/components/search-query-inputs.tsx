'use client'

import { buttonVariants } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { cn } from '@repo/ui/lib/utils'
import type { VariantProps } from 'class-variance-authority'
import { useLayoutEffect } from 'react'
import { useSetSearchQuery } from '@/hooks/use-set-search-query'
import { InlineScript } from './inline-script'

export function SearchQueryToggle({
  queryKey,
  variant = 'ghost',
  size = 'icon',
  children,
  className,
  ...props
}: React.ComponentProps<'label'> &
  VariantProps<typeof buttonVariants> & { queryKey: string }) {
  const setToggle = useSetSearchQuery(queryKey)

  // biome-ignore lint/correctness/useExhaustiveDependencies: update stale state from activity component on page nav
  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const inputElement = document.getElementById(
        `${queryKey}-query-toggle`,
      ) as HTMLInputElement | undefined

      if (inputElement) {
        const search = new URLSearchParams(location.search)
        inputElement.checked = search.get(queryKey) === 'true'
      }
    }
  }, [])

  return (
    <>
      <label
        className={cn(
          buttonVariants({ variant, size }),
          'has-checked:bg-muted has-checked:text-foreground active:not-aria-[haspopup]:translate-y-0',
          className,
        )}
        {...props}
      >
        {children}
        <input
          type='checkbox'
          className='hidden'
          onChange={(e) => setToggle(e.target.checked ? 'true' : null)}
          id={`${queryKey}-query-toggle`}
        />
      </label>

      <InlineScript
        html={`{var s=new URLSearchParams(location.search);var p=s.get("${queryKey}")==="true";var e=document.getElementById("${queryKey}-query-toggle");if (e){e.checked=p;}}`}
      />
    </>
  )
}

export function SearchQueryInput({
  queryKey,
  ...props
}: React.ComponentProps<typeof Input> & { queryKey: string }) {
  const setSearch = useSetSearchQuery(queryKey)

  // biome-ignore lint/correctness/useExhaustiveDependencies: update stale state from activity component on page nav
  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const inputElement = document.getElementById(`${queryKey}-query-input`) as
        | HTMLInputElement
        | undefined

      if (inputElement) {
        const search = new URLSearchParams(location.search)
        inputElement.value = decodeURIComponent(search.get(queryKey) ?? '')
      }
    }
  }, [])

  return (
    <>
      <Input
        id={`${queryKey}-query-input`}
        onChange={(e) => setSearch(e.target.value)}
        {...props}
      />

      <InlineScript
        html={`{var s=new URLSearchParams(location.search);var v=decodeURIComponent(s.get("${queryKey}")??"");var e=document.getElementById("${queryKey}-query-input");if (e){e.value=v}}`}
      />
    </>
  )
}
