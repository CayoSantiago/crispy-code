import { FIND_MIRROR_ROOT } from '@/features/find/config/data'
import {
  readFindConfig,
  updateFindConfig,
} from '@/features/find/config/service'
import {
  removeDirIfEmpty,
  removePathIfExists,
  resolveUnderRoot,
} from '@/lib/fs'

export async function removeGitHubRepoFromConfigAndDisk(input: {
  id: string
  owner?: string
  repo?: string
}): Promise<void> {
  const config = await readFindConfig()
  const existing = config.githubRepos.find((item) => item.id === input.id)
  const owner = existing?.owner ?? input.owner
  const repo = existing?.repo ?? input.repo

  if (!owner || !repo) {
    return
  }

  const mirrorPath = resolveUnderRoot(FIND_MIRROR_ROOT, owner, repo)
  if (!mirrorPath) {
    throw new Error('Refusing to delete outside the Find mirror root.')
  }

  try {
    await removePathIfExists(mirrorPath)
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not delete local mirror: ${error.message}`
        : 'Could not delete local mirror.',
    )
  }

  const ownerDir = resolveUnderRoot(FIND_MIRROR_ROOT, owner)
  if (ownerDir) {
    await removeDirIfEmpty(ownerDir)
  }

  await updateFindConfig((current) => ({
    ...current,
    githubRepos: current.githubRepos.filter((item) => item.id !== input.id),
  }))
}
