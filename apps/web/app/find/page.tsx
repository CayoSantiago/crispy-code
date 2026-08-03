import '@/lib/orpc/client.server'
import { InputGroup, InputGroupAddon } from '@repo/ui/components/input-group'
import { CaseSensitiveIcon, FilterIcon, RegexIcon } from 'lucide-react'
import { Suspense } from 'react'
import { ConfigErrorMessage } from '@/components/find/config-error-message'
import {
  SearchQueryInput,
  SearchQueryToggle,
} from '@/components/find/search-filters'
import { SearchResults } from '@/components/find/search-results'
import {
  SourcesSheet,
  ToggleSourcesSheetButton,
} from '@/components/find/sources-sheet'

export default function FindPage() {
  return (
    <div className='grid grid-cols-1 gap-6 w-full'>
      <div className='grid gap-6 grid-cols-1'>
        <div className='flex items-baseline justify-between gap-4'>
          <h1 className='text-3xl font-semibold tracking-tight'>Code Finder</h1>
          <ToggleSourcesSheetButton
            variant='ghost'
            size='sm'
            className='text-muted-foreground'
          >
            Sources
          </ToggleSourcesSheetButton>
        </div>

        <ConfigErrorMessage />

        <div className='grid gap-6 grid-cols-1'>
          <div className='grid gap-2'>
            <InputGroup className='h-9 bg-card'>
              {/* <div className='flex items-center gap-1 rounded-lg border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50'> */}
              <SearchQueryInput
                queryKey='q'
                placeholder='Search code...'
                className='flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent'
                autoComplete='off'
              />
              <InputGroupAddon align='inline-end'>
                <SearchQueryToggle
                  queryKey='case'
                  aria-label='Toggle match case'
                >
                  <CaseSensitiveIcon className='size-3.5 stroke-[1.6]' />
                </SearchQueryToggle>
                <SearchQueryToggle
                  queryKey='regex'
                  aria-label='Toggle use regex'
                >
                  <RegexIcon className='size-3.5 stroke-[1.6]' />
                </SearchQueryToggle>
              </InputGroupAddon>
              {/* </div> */}
            </InputGroup>

            <InputGroup className='border-transparent bg-transparent dark:bg-transparent'>
              <SearchQueryInput
                queryKey='path'
                className='flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent'
                placeholder='Path glob — **/*.{ts,tsx}'
                autoComplete='off'
              />
              <InputGroupAddon align='inline-start'>
                <FilterIcon className='stroke-[1.6]' />
              </InputGroupAddon>
            </InputGroup>
          </div>

          <Suspense>
            <SearchResults />
          </Suspense>
        </div>
      </div>

      <Suspense>
        <SourcesSheet />
      </Suspense>
    </div>
  )
}
