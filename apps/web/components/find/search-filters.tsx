'use client'

import { buttonVariants } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { cn } from '@repo/ui/lib/utils'
import type { VariantProps } from 'class-variance-authority'
import { useTransition } from 'react'
import { InlineScript } from '../inline-script'

export function SearchQueryToggle({
  queryKey,
  variant = 'ghost',
  size = 'icon',
  children,
  className,
  ...props
}: React.ComponentProps<'label'> &
  VariantProps<typeof buttonVariants> & { queryKey: string }) {
  const [, startTransition] = useTransition()

  const handleToggle = (isActive: boolean) => {
    if (typeof window === 'undefined') return

    const newSearch = new URLSearchParams(location.search)

    if (isActive) newSearch.set(queryKey, 'true')
    else newSearch.delete(queryKey)

    startTransition(() =>
      history.replaceState(null, '', `?${newSearch.toString()}`),
    )
  }

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
          onChange={(e) => handleToggle(e.target.checked)}
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
  const [, startTransition] = useTransition()

  const handleChange = (val: string) => {
    if (typeof window === 'undefined') return

    const newSearch = new URLSearchParams(location.search)

    if (decodeURIComponent(newSearch.get(queryKey) ?? '') === val) return

    if (val) newSearch.set(queryKey, encodeURIComponent(val))
    else newSearch.delete(queryKey)

    startTransition(() =>
      history.replaceState(null, '', `?${newSearch.toString()}`),
    )
  }

  return (
    <>
      <Input
        id={`${queryKey}-query-input`}
        onChange={(event) => handleChange(event.target.value)}
        {...props}
      />
      <InlineScript
        html={`{var s=new URLSearchParams(location.search);var v=decodeURIComponent(s.get("${queryKey}")??"");var e=document.getElementById("${queryKey}-query-input");if (e){e.value=v}}`}
      />
    </>
  )
}
