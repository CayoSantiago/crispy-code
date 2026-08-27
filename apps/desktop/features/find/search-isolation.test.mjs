import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { isReadableDirectory } from '../../lib/is-readable-directory.ts'
import { settleSourceSearches } from './settle-source-searches.ts'

test('a failed source does not discard successful source results', async () => {
  const sources = [{ id: 'working' }, { id: 'broken' }]

  const result = await settleSourceSearches(sources, async (source) => {
    if (source.id === 'broken') {
      throw new Error('source unavailable')
    }
    return [`result:${source.id}`]
  })

  assert.deepEqual(result.results, [['result:working']])
  assert.deepEqual(result.unavailable, [{ id: 'broken' }])
})

test('isReadableDirectory rejects readable files', async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'crispy-dir-'))
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }))
  const filePath = path.join(temporaryRoot, 'file.txt')
  await writeFile(filePath, 'readable')

  assert.equal(await isReadableDirectory(temporaryRoot), true)
  assert.equal(await isReadableDirectory(filePath), false)
})
