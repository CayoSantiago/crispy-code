import { CaseSensitiveIcon, RegexIcon } from 'lucide-react'
import { SearchQueryInput, SearchQueryToggle } from './search-filters'

export function SearchChrome() {
  return (
    <div className='grid gap-2'>
      <div className='flex items-center gap-1 rounded-lg border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50'>
        <SearchQueryInput
          queryKey='q'
          className='h-11 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0'
          placeholder='Search code...'
          autoComplete='off'
        />
        <div className='flex shrink-0 items-center gap-0.5'>
          <SearchQueryToggle
            queryKey='case'
            aria-label='Toggle match case'
            className='size-7'
          >
            <CaseSensitiveIcon className='size-3.5 stroke-[1.6]' />
          </SearchQueryToggle>
          <SearchQueryToggle
            queryKey='regex'
            aria-label='Toggle use regex'
            className='size-7'
          >
            <RegexIcon className='size-3.5 stroke-[1.6]' />
          </SearchQueryToggle>
        </div>
      </div>
      <SearchQueryInput
        queryKey='path'
        className='h-9 text-xs text-muted-foreground'
        placeholder='Path glob — **/*.{ts,tsx}'
        autoComplete='off'
      />
    </div>
  )
}
