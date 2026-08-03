import '@/lib/orpc/client.server'
import { InputGroup, InputGroupAddon } from '@repo/ui/components/input-group'
import {
  CaseSensitiveIcon,
  FilterIcon,
  FolderGit2Icon,
  RegexIcon,
} from 'lucide-react'
import { Suspense } from 'react'
import { ConfigErrorMessage } from '@/components/find/config-error-message'
import { FindAutoSync } from '@/components/find/find-auto-sync'
import {
  SearchQueryInput,
  SearchQueryToggle,
} from '@/components/find/search-query-inputs'
import { SearchResults } from '@/components/find/search-results'
import {
  SourcesSheet,
  ToggleSourcesSheetButton,
} from '@/components/find/sources-sheet'
import { Tooltip } from '@/components/tooltip'

export default function FindPage() {
  return (
    <>
      <div className='flex items-baseline justify-between gap-4'>
        <h1 className='text-3xl font-semibold tracking-tight'>Code Finder</h1>
        <ToggleSourcesSheetButton
          variant='ghost'
          size='lg'
          className='text-muted-foreground'
        >
          <FolderGit2Icon />
          <span className='sr-only md:not-sr-only'>Repos</span>
        </ToggleSourcesSheetButton>
      </div>

      <FindAutoSync />

      <ConfigErrorMessage />

      <div className='grid gap-2 grid-cols-1'>
        <InputGroup className='h-9 bg-card'>
          <SearchQueryInput
            queryKey='q'
            placeholder='Search code...'
            className='flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent'
            autoComplete='off'
          />
          <InputGroupAddon align='inline-end' className='gap-0.75 pr-1.5'>
            <Tooltip
              tooltip='Match Case'
              render={
                <SearchQueryToggle
                  queryKey='case'
                  aria-label='Toggle match case'
                />
              }
            >
              <CaseSensitiveIcon className='size-3.5 stroke-[1.6]' />
            </Tooltip>
            <Tooltip
              tooltip='Use Regular Expression'
              render={
                <SearchQueryToggle
                  queryKey='regex'
                  aria-label='Toggle use regular expression'
                />
              }
            >
              <RegexIcon className='size-3.5 stroke-[1.6]' />
            </Tooltip>
          </InputGroupAddon>
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

      <Suspense>
        <SourcesSheet />
      </Suspense>
    </>
  )
}
