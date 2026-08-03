'use client'

import { Button } from '@repo/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@repo/ui/components/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components/tabs'
import { useRouter, useSearchParams } from 'next/navigation'
import { SourcesPanel } from '@/components/find/sources-panel'
import { SyncPanel } from '@/components/find/sync-panel'

const QUERY_KEY = 'sources'

export function SourcesSheet() {
  const search = useSearchParams()
  const router = useRouter()

  const open = search.get(QUERY_KEY) === 'open'

  const handleOpenChange = (isOpen: boolean) => {
    const newSearch = new URLSearchParams(search.toString())
    if (!isOpen) newSearch.delete(QUERY_KEY)
    else newSearch.set(QUERY_KEY, 'open')
    router.replace(`?${newSearch.toString()}`)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side='right' className='w-full sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle>Sources</SheetTitle>
        </SheetHeader>
        <Tabs
          defaultValue='sources'
          className='flex min-h-0 flex-1 flex-col px-4 pb-4'
        >
          <TabsList variant='line' className='w-full'>
            <TabsTrigger value='sources'>Sources</TabsTrigger>
            <TabsTrigger value='sync'>Sync</TabsTrigger>
          </TabsList>
          <TabsContent value='sources' className='overflow-y-auto pt-4'>
            <SourcesPanel />
          </TabsContent>
          <TabsContent value='sync' className='overflow-y-auto pt-4'>
            <SyncPanel />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

export function ToggleSourcesSheetButton(
  props: React.ComponentProps<typeof Button>,
) {
  const toggleOpen = () => {
    if (typeof window === 'undefined') return
    const newSearch = new URLSearchParams(window.location.search)
    const open = newSearch.get(QUERY_KEY) === 'open'

    if (open) newSearch.delete(QUERY_KEY)
    else newSearch.set(QUERY_KEY, 'open')

    window.history.replaceState(null, '', `?${newSearch.toString()}`)
  }

  return <Button onClick={toggleOpen} {...props} />
}
