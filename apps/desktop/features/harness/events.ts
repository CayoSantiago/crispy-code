import type { HarnessEvent } from '@/features/harness/types'

type TurnEventListener = (event: HarnessEvent) => void

const listenersByTurnId = new Map<string, Set<TurnEventListener>>()

export function subscribeTurnEvents(
  turnId: string,
  listener: TurnEventListener,
): () => void {
  let listeners = listenersByTurnId.get(turnId)
  if (!listeners) {
    listeners = new Set()
    listenersByTurnId.set(turnId, listeners)
  }
  listeners.add(listener)

  return () => {
    const current = listenersByTurnId.get(turnId)
    if (!current) {
      return
    }
    current.delete(listener)
    if (current.size === 0) {
      listenersByTurnId.delete(turnId)
    }
  }
}

export function publishTurnEvent(turnId: string, event: HarnessEvent): void {
  const listeners = listenersByTurnId.get(turnId)
  if (!listeners) {
    return
  }

  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      // Listener errors must not break the publisher.
    }
  }
}
