import assert from 'node:assert/strict'
import test from 'node:test'
import { publishTurnEvent, subscribeTurnEvents } from './events.ts'

test('subscribeTurnEvents replays accumulated events before live events', () => {
  const turnId = 'late-subscription-running-turn'

  publishTurnEvent(turnId, { type: 'stage', stage: 'PLANNING' })
  publishTurnEvent(turnId, {
    type: 'token',
    kind: 'thinking',
    text: 'First ',
  })
  publishTurnEvent(turnId, {
    type: 'token',
    kind: 'thinking',
    text: 'thought',
  })
  publishTurnEvent(turnId, { type: 'stage', stage: 'WRITING' })
  publishTurnEvent(turnId, {
    type: 'token',
    kind: 'answer',
    text: 'Answer ',
  })

  const received = []
  const unsubscribe = subscribeTurnEvents(turnId, (event) => {
    received.push(event)
  })

  assert.deepEqual(received, [
    { type: 'stage', stage: 'WRITING' },
    { type: 'token', kind: 'thinking', text: 'First thought' },
    { type: 'token', kind: 'answer', text: 'Answer ' },
  ])

  publishTurnEvent(turnId, {
    type: 'token',
    kind: 'answer',
    text: 'complete',
  })
  publishTurnEvent(turnId, { type: 'done' })

  assert.deepEqual(received.slice(-2), [
    { type: 'token', kind: 'answer', text: 'complete' },
    { type: 'done' },
  ])
  unsubscribe()
})

test('subscribeTurnEvents retains a terminal snapshot for a late subscriber', () => {
  const turnId = 'late-subscription-completed-turn'

  publishTurnEvent(turnId, {
    type: 'token',
    kind: 'answer',
    text: 'Complete answer',
  })
  publishTurnEvent(turnId, { type: 'done' })

  const received = []
  const unsubscribe = subscribeTurnEvents(turnId, (event) => {
    received.push(event)
  })

  assert.deepEqual(received, [
    { type: 'token', kind: 'answer', text: 'Complete answer' },
    { type: 'done' },
  ])
  unsubscribe()
})
