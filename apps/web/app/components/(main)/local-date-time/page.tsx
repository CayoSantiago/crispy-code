import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react'
import type { Metadata } from 'next'
import { ComponentPreview } from '@/components/component-preview'
import { LocalDateTime } from '@/components/local-datetime'
import { highlighter } from '@/lib/highlighter'

const pathName = join(process.cwd(), 'components', 'local-datetime.tsx')
const code = readFileSync(pathName, 'utf-8')

const props = createHighlightedCodeBlockProps({
  highlighter,
  code,
  lang: 'tsx',
  lineNumbers: true,
})

const today = new Date()

export const metadata = {
  title: 'Local Date-Time',
  description:
    "Display date-time in user's local timezone with no flash on initial render",
} satisfies Metadata

export default function ComponentsLocalDateTimePage() {
  return (
    <ComponentPreview
      id='local-date-time'
      header={metadata.title}
      desc={metadata.description}
      {...props}
    >
      <div className='grid grid-cols-[auto_1fr] auto-rows-max gap-x-3 gap-y-2 [&>div]:text-right [&>div]:font-medium'>
        <div>Date</div>
        <LocalDateTime variant='date' dateTime={today} />

        <div>Time</div>
        <LocalDateTime variant='time' dateTime={today.toISOString()} />

        <div>DateTime</div>
        <LocalDateTime variant='dateTime' dateTime={today.valueOf()} />
      </div>
    </ComponentPreview>
  )
}
