import assert from 'node:assert/strict'
import test from 'node:test'
import { reconcileTurnAnswer } from './reconcile-turn-answer.ts'
import { threadTitleFromQuestion } from './title.ts'

test('threadTitleFromQuestion normalizes whitespace', () => {
  assert.equal(
    threadTitleFromQuestion('  Where   is\n the date picker?  '),
    'Where is the date picker?',
  )
})

test('threadTitleFromQuestion limits titles to 80 characters', () => {
  const title = threadTitleFromQuestion('a'.repeat(100))

  assert.equal(title.length, 80)
  assert.equal(title.at(-1), '…')
})

test('reconcileTurnAnswer uses the complete prefix-compatible value', () => {
  assert.equal(
    reconcileTurnAnswer('Complete ', 'Complete answer'),
    'Complete answer',
  )
  assert.equal(
    reconcileTurnAnswer('Complete answer', 'Complete '),
    'Complete answer',
  )
})

test('reconcileTurnAnswer does not replace stored text with a partial suffix', () => {
  assert.equal(
    reconcileTurnAnswer(
      'This is the persisted prefix.',
      'unrelated streamed suffix that happens to be longer',
    ),
    'This is the persisted prefix.',
  )
})
