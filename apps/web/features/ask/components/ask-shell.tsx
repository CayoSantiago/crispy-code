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
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='min-h-0 flex-1'>
        <MessageScrollerProvider autoScroll>
          <MessageScroller className='h-full'>
            <MessageScrollerViewport>
              <MessageScrollerContent>{children}</MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>
      <div className='shrink-0'>{composer}</div>
    </div>
  )
}
