import { writeFile } from 'node:fs/promises'
import { FIND_CONFIG_PATH, FIND_HOME } from '@/features/find/config/data'
import {
  type FindConfig,
  findConfigSchema,
} from '@/features/find/config/schemas'
import { ensureDir, getParsedJsonFileData } from '@/lib/fs'

let updateQueue: Promise<unknown> = Promise.resolve()

export async function readFindConfig() {
  return getParsedJsonFileData({
    path: FIND_CONFIG_PATH,
    schema: findConfigSchema,
    defaultValue: {
      localRoots: [],
      githubRepos: [],
    },
  })
}

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
  await writeFile(
    FIND_CONFIG_PATH,
    `${JSON.stringify(config, null, 2)}\n`,
    'utf8',
  )
}
