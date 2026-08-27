import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { resolveFileWithinRoots } from './file-access.ts'

test('resolveFileWithinRoots rejects symlinks escaping a configured root', async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'crispy-root-'))
  context.after(() => rm(temporaryRoot, { recursive: true, force: true }))
  const configuredRoot = path.join(temporaryRoot, 'configured')
  const outsideRoot = path.join(temporaryRoot, 'outside')
  await Promise.all([mkdir(configuredRoot), mkdir(outsideRoot)])

  const insideFile = path.join(configuredRoot, 'inside.txt')
  const outsideFile = path.join(outsideRoot, 'secret.txt')
  const escapedLink = path.join(configuredRoot, 'escaped.txt')
  await Promise.all([
    writeFile(insideFile, 'inside'),
    writeFile(outsideFile, 'secret'),
  ])
  await symlink(outsideFile, escapedLink)

  assert.equal(
    await resolveFileWithinRoots(insideFile, [configuredRoot]),
    insideFile,
  )
  assert.equal(
    await resolveFileWithinRoots(escapedLink, [configuredRoot]),
    null,
  )
})
