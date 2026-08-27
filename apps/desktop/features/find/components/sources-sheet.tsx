'use client'

import { Button } from '@repo/ui/components/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@repo/ui/components/sheet'
import { useRouter, useSearchParams } from 'next/navigation'
import { SourcesPanel } from '@/features/find/components/sources-panel'

const QUERY_KEY = 'sources'

export function SourcesSheet() {
  const search = useSearchParams()
  const router = useRouter()
  const open = search.get(QUERY_KEY) === 'open'

  const handleOpenChange = (isOpen: boolean) => {
    const next = new URLSearchParams(search.toString())
    if (isOpen) next.set(QUERY_KEY, 'open')
    else next.delete(QUERY_KEY)
    router.replace(`?${next.toString()}`)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side='right' className='w-full sm:max-w-md'>
        <SheetHeader className='border-b'>
          <SheetTitle>Local folders</SheetTitle>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto p-4'>
          <SourcesPanel />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ToggleSourcesSheetButton(
  props: React.ComponentProps<typeof Button>,
) {
  const toggleOpen = () => {
    if (typeof window === 'undefined') return

    const search = new URLSearchParams(window.location.search)
    if (search.get(QUERY_KEY) === 'open') search.delete(QUERY_KEY)
    else search.set(QUERY_KEY, 'open')
    window.history.replaceState(null, '', `?${search.toString()}`)
  }

  return <Button onClick={toggleOpen} {...props} />
}
