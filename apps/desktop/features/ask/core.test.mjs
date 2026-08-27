import assert from 'node:assert/strict'
import test from 'node:test'
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
