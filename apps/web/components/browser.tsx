import { cn } from '@repo/ui/lib/utils'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
} from 'lucide-react'
import type * as React from 'react'
import { CopyButton } from './copy-button'

export function Browser({
  url,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  url: string
}) {
  return (
    <div
      className={cn(
        '@container/browser rounded-xl bg-card border shadow-xs w-full overflow-clip',
        className,
      )}
      {...props}
    >
      <div className='py-2 @xl/browser:py-2.5 px-4 @xl/browser:px-5 grid grid-cols-[auto_1fr] @3xl/browser:grid-cols-[140px_1fr_140px] gap-4 @xl/browser:gap-6'>
        <div className='flex items-center gap-4 w-full'>
          <div className='flex items-center gap-2'>
            <div className='size-3 rounded-full bg-[#FE5F57]' />
            <div className='size-3 rounded-full bg-[#FEBB2E]' />
            <div className='size-3 rounded-full bg-[#26C941]' />
          </div>
          <div className='flex items-center gap-[15px] grow [&_svg]:text-muted-foreground [&_svg]:size-3.5 @max-xl/browser:hidden'>
            <ArrowLeftIcon />
            <ArrowRightIcon />
            <RefreshCwIcon />
          </div>
        </div>

        <div className='@3xl/browser:max-w-xs bg-secondary border rounded-full pl-4 pr-1 py-1 @3xl/browser:mx-auto @3xl/browser:w-full grid grid-cols-[1fr_auto] items-center'>
          <a
            href={`https://${url}`}
            target='_blank'
            rel='noopener'
            className='text-[13px] text-center truncate mx-auto max-w-full'
          >
            {url}
          </a>
          <CopyButton
            size='icon-sm'
            copyText={url}
            className='rounded-full hover:brightness-95 dark:hover:brightness-125'
          >
            <CheckIcon className='absolute inset-0 m-auto opacity-0 group-data-[copied="true"]/copy-button:opacity-100' />
            <CopyIcon className='absolute inset-0 m-auto group-data-[copied="true"]/copy-button:opacity-0' />
            <span className='sr-only'>Copy</span>
          </CopyButton>
        </div>
      </div>

      <div className='grid place-items-center empty:p-6 bg-secondary'>
        {children}
      </div>
    </div>
  )
}
