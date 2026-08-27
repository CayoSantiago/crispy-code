import '@/lib/orpc/client.server'
import { FolderSearchIcon } from 'lucide-react'
import { Suspense } from 'react'
import { ConfigErrorMessage } from '@/features/find/components/config-error-message'
import { SearchChrome } from '@/features/find/components/search-chrome'
import { SearchResults } from '@/features/find/components/search-results'
import {
  SourcesSheet,
  ToggleSourcesSheetButton,
} from '@/features/find/components/sources-sheet'

export default function FindPage() {
  return (
    <>
      <div className='flex items-center gap-2'>
        <h1 className='grow text-2xl font-bold tracking-tight'>Code Finder</h1>
        <ToggleSourcesSheetButton
          variant='ghost'
          size='lg'
          className='text-muted-foreground'
        >
          <FolderSearchIcon />
          <span className='sr-only md:not-sr-only'>Local folders</span>
        </ToggleSourcesSheetButton>
      </div>
      <ConfigErrorMessage />
      <SearchChrome />
      <Suspense>
        <SearchResults />
      </Suspense>
      <Suspense>
        <SourcesSheet />
      </Suspense>
    </>
  )
}
