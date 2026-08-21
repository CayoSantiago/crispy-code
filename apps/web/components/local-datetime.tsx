'use client'

import { useId } from 'react'
import { InlineScript } from './inline-script'

type DateTimeVariant = 'date' | 'time' | 'dateTime'

const DATE_FN = {
  date: 'toLocaleDateString',
  time: 'toLocaleTimeString',
  dateTime: 'toLocaleString',
} satisfies Record<DateTimeVariant, keyof Date>

const DEFAULT_OPTIONS = {
  date: {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  },
  time: {
    hour: '2-digit',
    minute: '2-digit',
  },
  dateTime: {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
} satisfies Record<DateTimeVariant, Intl.DateTimeFormatOptions>

export function LocalDateTime({
  dateTime,
  options,
  variant = 'dateTime',
}: {
  dateTime: string | number | Date
  options?: Intl.DateTimeFormatOptions
  variant?: DateTimeVariant
}) {
  const id = useId()

  const dateFn = DATE_FN[variant]

  const _options = { ...DEFAULT_OPTIONS[variant], ...options }

  const date = new Date(dateTime)
  const iso = date.toISOString()

  return (
    <>
      <time id={id} dateTime={iso} suppressHydrationWarning>
        {new Date(dateTime)[dateFn](undefined, _options)}
      </time>

      <InlineScript
        html={`{var n=document.getElementById("${id}");if(n)n.textContent=new Date("${iso}").${dateFn}(undefined,${JSON.stringify(_options)})}`}
      />
    </>
  )
}
