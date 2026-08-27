import type { HarnessEvent } from '@/features/harness/types'

type TurnEventListener = (event: HarnessEvent) => void

type TurnEventSnapshot = {
  stage?: Extract<HarnessEvent, { type: 'stage' }>['stage']
  thinking: string
  answer: string
  terminal?: Extract<HarnessEvent, { type: 'done' | 'error' }>
}

const TERMINAL_SNAPSHOT_RETENTION_MS = 60_000
const listenersByTurnId = new Map<string, Set<TurnEventListener>>()
const snapshotsByTurnId = new Map<string, TurnEventSnapshot>()

export function subscribeTurnEvents(
  turnId: string,
  listener: TurnEventListener,
): () => void {
  const snapshot = snapshotsByTurnId.get(turnId)
  if (snapshot?.terminal) {
    replaySnapshot(snapshot, listener)
    return () => {
      // A terminal snapshot has no live subscription to remove.
    }
  }

  let listeners = listenersByTurnId.get(turnId)
  if (!listeners) {
    listeners = new Set()
    listenersByTurnId.set(turnId, listeners)
  }
  listeners.add(listener)
  if (snapshot) {
    replaySnapshot(snapshot, listener)
  }

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
  const snapshot = snapshotsByTurnId.get(turnId) ?? {
    thinking: '',
    answer: '',
  }
  snapshotsByTurnId.set(turnId, snapshot)

  if (event.type === 'stage') {
    snapshot.stage = event.stage
  } else if (event.type === 'token') {
    snapshot[event.kind] += event.text
  } else if (!snapshot.terminal) {
    snapshot.terminal = event
    const cleanup = setTimeout(() => {
      if (snapshotsByTurnId.get(turnId) === snapshot) {
        snapshotsByTurnId.delete(turnId)
      }
    }, TERMINAL_SNAPSHOT_RETENTION_MS)
    cleanup.unref()
  }

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

function replaySnapshot(
  snapshot: TurnEventSnapshot,
  listener: TurnEventListener,
): void {
  if (snapshot.stage) {
    notifyListener(listener, { type: 'stage', stage: snapshot.stage })
  }
  if (snapshot.thinking) {
    notifyListener(listener, {
      type: 'token',
      kind: 'thinking',
      text: snapshot.thinking,
    })
  }
  if (snapshot.answer) {
    notifyListener(listener, {
      type: 'token',
      kind: 'answer',
      text: snapshot.answer,
    })
  }
  if (snapshot.terminal) {
    notifyListener(listener, snapshot.terminal)
  }
}

function notifyListener(
  listener: TurnEventListener,
  event: HarnessEvent,
): void {
  try {
    listener(event)
  } catch {
    // Listener errors must not break replay.
  }
}
