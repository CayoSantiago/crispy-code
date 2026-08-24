'use client'

import { useRealtime } from 'inngest/react'
import { askTurnChannel } from '@/features/ask/realtime'
import { client } from '@/lib/orpc/client'

export function useAskTurnStream(threadId: string, turnId: string | undefined) {
  const { messages } = useRealtime({
    enabled: Boolean(turnId),
    channel: turnId ? askTurnChannel({ turnId }) : undefined,
    topics: ['tokens'],
    historyLimit: 0,
    token: async () => {
      if (!turnId) {
        throw new Error('Missing turn.')
      }
      return client.ask.realtimeToken({ threadId, turnId })
    },
  })

  let thinking = ''
  let answer = ''

  for (const message of messages.all) {
    if (message.kind !== 'data' || message.topic !== 'tokens') {
      continue
    }
    if (message.data.kind === 'thinking') {
      thinking += message.data.text
    }
    if (message.data.kind === 'answer') {
      answer += message.data.text
    }
  }

  return { thinking, answer }
}
