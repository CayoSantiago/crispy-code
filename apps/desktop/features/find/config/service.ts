import { randomUUID } from 'node:crypto'
import { rename, rm, writeFile } from 'node:fs/promises'
import { cache } from 'react'
import { FIND_CONFIG_PATH, FIND_HOME } from '@/features/find/config/data'
import {
  type FindConfig,
  findConfigSchema,
} from '@/features/find/config/schemas'
import { ensureDir, getParsedJsonFileData } from '@/lib/fs'

let updateQueue: Promise<unknown> = Promise.resolve()

export const readFindConfig = cache(async () => {
  return getParsedJsonFileData({
    path: FIND_CONFIG_PATH,
    schema: findConfigSchema,
    defaultValue: {
      localRoots: [],
      githubRepos: [],
    },
  })
})

export async function updateFindConfig(
  update: (current: FindConfig) => FindConfig,
): Promise<FindConfig> {
  const task = updateQueue.then(async () => {
    const current = await readFindConfig()
    const next = findConfigSchema.parse(update(current))
    await writeFindConfig(next)
    return next
  })
  updateQueue = task.catch(() => undefined)
  return task
}

async function writeFindConfig(config: FindConfig): Promise<void> {
  await ensureDir(FIND_HOME)
  const temporaryPath = `${FIND_CONFIG_PATH}.${process.pid}.${randomUUID()}.tmp`

  try {
    await writeFile(
      temporaryPath,
      `${JSON.stringify(config, null, 2)}\n`,
      'utf8',
    )
    await rename(temporaryPath, FIND_CONFIG_PATH)
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
    throw error
  }
}
