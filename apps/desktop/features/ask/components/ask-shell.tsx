'use client'

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@repo/ui/components/message-scroller'

export function AskShell({
  children,
  composer,
}: {
  children: React.ReactNode
  composer: React.ReactNode
}) {
  return (
    <div className='mx-auto grid w-full max-w-7xl grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-4'>
      <MessageScrollerProvider autoScroll>
        <MessageScroller className='h-full'>
          <MessageScrollerViewport>
            <MessageScrollerContent>{children}</MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {composer}
    </div>
  )
}
