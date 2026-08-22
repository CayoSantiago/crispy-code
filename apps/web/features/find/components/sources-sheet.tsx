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
import { GitHubSourcesPanel } from '@/features/find/components/github-sources-panel'
import { SourcesPanel } from '@/features/find/components/sources-panel'

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
          <SheetTitle>Repos</SheetTitle>
        </SheetHeader>
        <Tabs
          defaultValue='local'
          className='flex min-h-0 flex-1 flex-col px-4 pb-4'
        >
          <TabsList variant='line' className='w-full'>
            <TabsTrigger value='local'>Local</TabsTrigger>
            <TabsTrigger value='github'>GitHub</TabsTrigger>
          </TabsList>
          <TabsContent value='local' className='overflow-y-auto pt-4'>
            <SourcesPanel />
          </TabsContent>
          <TabsContent value='github' className='overflow-y-auto pt-4'>
            <GitHubSourcesPanel />
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
