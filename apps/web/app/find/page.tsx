import '@/lib/orpc/client.server'
import { InputGroup, InputGroupAddon } from '@repo/ui/components/input-group'
import {
  CaseSensitiveIcon,
  FilterIcon,
  FolderGit2Icon,
  RegexIcon,
  SearchIcon,
} from 'lucide-react'
import { Suspense } from 'react'
import { ConfigErrorMessage } from '@/components/find/config-error-message'
import { FindAutoSync } from '@/components/find/find-auto-sync'
import { SearchResults } from '@/components/find/search-results'
import {
  SourcesSheet,
  ToggleSourcesSheetButton,
} from '@/components/find/sources-sheet'
import {
  SearchQueryInput,
  SearchQueryToggle,
} from '@/components/search-query-inputs'
import { Tooltip } from '@/components/tooltip'

export default function FindPage() {
  return (
    <>
      <div className='flex items-center gap-2'>
        <h1 className='text-3xl font-semibold tracking-tight grow'>
          Code Finder
        </h1>

        <FindAutoSync />
        <ToggleSourcesSheetButton
          variant='ghost'
          size='lg'
          className='text-muted-foreground'
        >
          <FolderGit2Icon />
          <span className='sr-only md:not-sr-only'>Repos</span>
        </ToggleSourcesSheetButton>
      </div>

      <ConfigErrorMessage />

      <div className='grid gap-2 grid-cols-1 -mt-2'>
        <InputGroup className='h-9 bg-card rounded-full'>
          <SearchQueryInput
            queryKey='q'
            placeholder='Search code...'
            className='flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent'
            autoComplete='off'
          />
          <InputGroupAddon align='inline-start' className='pl-[11px]!'>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align='inline-end' className='gap-0.75 pr-1.5'>
            <Tooltip
              tooltip='Match Case'
              render={
                <SearchQueryToggle
                  queryKey='case'
                  aria-label='Toggle match case'
                  className='rounded-full'
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
                  className='rounded-full'
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
          <InputGroupAddon align='inline-start' className='pl-[11px]!'>
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
