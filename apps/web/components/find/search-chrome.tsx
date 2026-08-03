'use client'

import { Input } from '@repo/ui/components/input'
import { cn } from '@repo/ui/lib/utils'
import type { SearchMode } from '@/features/find/schemas'

export type SearchChromeProps = {
  query: string
  mode: SearchMode
  caseSensitive: boolean
  pathGlob: string
  onQueryChange: (value: string) => void
  onModeChange: (mode: SearchMode) => void
  onCaseSensitiveChange: (value: boolean) => void
  onPathGlobChange: (value: string) => void
}

function SearchToggle({
  pressed,
  label,
  title,
  onPressedChange,
  className,
}: {
  pressed: boolean
  label: string
  title: string
  onPressedChange: (next: boolean) => void
  className?: string
}) {
  return (
    <button
      type='button'
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        'rounded-sm px-1.5 py-0.5 text-xs font-medium leading-none transition-colors',
        pressed
          ? 'bg-primary/15 text-foreground'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {label}
    </button>
  )
}

export function SearchChrome({
  query,
  mode,
  caseSensitive,
  pathGlob,
  onQueryChange,
  onModeChange,
  onCaseSensitiveChange,
  onPathGlobChange,
}: SearchChromeProps) {
  return (
    <div className='grid gap-2'>
      <div className='flex items-center gap-1 rounded-lg border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50'>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder='Search code...'
          autoComplete='off'
          className='h-11 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0'
        />
        <div className='flex shrink-0 items-center gap-0.5'>
          <SearchToggle
            pressed={caseSensitive}
            label='Aa'
            title='Match Case'
            onPressedChange={onCaseSensitiveChange}
          />
          <SearchToggle
            pressed={mode === 'regex'}
            label='.*'
            title='Use Regular Expression'
            onPressedChange={(next) => onModeChange(next ? 'regex' : 'literal')}
            className='font-mono'
          />
        </div>
      </div>
      <Input
        value={pathGlob}
        onChange={(event) => onPathGlobChange(event.target.value)}
        placeholder='Path glob — **/*.{ts,tsx}'
        autoComplete='off'
        className='h-9 text-xs text-muted-foreground'
      />
    </div>
  )
}
