'use client'

import { useEffect, useState } from 'react'
import type { HarnessEvent } from '@/features/harness/types'

export function useAskTurnStream(turnId: string | undefined) {
  const [thinking, setThinking] = useState('')
  const [answer, setAnswer] = useState('')

  useEffect(() => {
    if (!turnId) return

    setThinking('')
    setAnswer('')
    const source = new EventSource(
      `/api/ask/turn-events?turnId=${encodeURIComponent(turnId)}`,
      { withCredentials: true },
    )

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as HarnessEvent
      if (event.type === 'token' && event.kind === 'thinking') {
        setThinking((current) => current + event.text)
      }
      if (event.type === 'token' && event.kind === 'answer') {
        setAnswer((current) => current + event.text)
      }
      if (event.type === 'done' || event.type === 'error') {
        source.close()
      }
    }

    return () => source.close()
  }, [turnId])

  return { thinking, answer }
}
