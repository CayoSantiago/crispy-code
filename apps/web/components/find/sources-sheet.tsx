'use client'

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
import { useEffect, useState } from 'react'
import { SourcesPanel } from '@/components/find/sources-panel'
import { SyncPanel } from '@/components/find/sync-panel'

export function SourcesSheet({
  open,
  onOpenChange,
  defaultTab = 'sources',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: 'sources' | 'sync'
}) {
  const [tab, setTab] = useState(defaultTab)

  useEffect(() => {
    if (open) {
      setTab(defaultTab)
    }
  }, [open, defaultTab])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle>Sources</SheetTitle>
        </SheetHeader>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (value === 'sources' || value === 'sync') {
              setTab(value)
            }
          }}
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
