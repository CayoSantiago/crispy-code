import path from 'node:path'
import { z } from 'zod/v4'
import { findConfigSchema } from '@/features/find/config/schemas'
import {
  readFindConfig,
  updateFindConfig,
} from '@/features/find/config/service'
import {
  searchResponseSchema,
  searchRpcInputSchema,
} from '@/features/find/schemas'
import { executeSearch } from '@/features/find/service'
import { isReadableDir, normalizeLocalPath } from '@/lib/fs'
import { base } from '@/lib/orpc/base'
import { successResponseSchema } from '@/lib/schemas'

function nowIso(): string {
  return new Date().toISOString()
}

export const findRouter = {
  getConfig: base
    .output(findConfigSchema)
    .handler(async () => readFindConfig()),
  search: base
    .input(searchRpcInputSchema)
    .output(searchResponseSchema)
    .handler(async ({ input, signal }) =>
      executeSearch({ ...input, maxResultsPerSource: 50 }, signal),
    ),
  addLocalRoot: base
    .input(z.object({ localPath: z.string().trim().min(1) }))
    .output(successResponseSchema)
    .handler(async ({ input, errors }) => {
      const normalized = normalizeLocalPath(input.localPath)
      const absolute = path.resolve(normalized)

      if (!(await isReadableDir(absolute))) {
        throw errors.BAD_REQUEST({
          message: 'That folder cannot be read. Check the path and try again.',
        })
      }

      await updateFindConfig((current) => {
        if (current.localRoots.some((item) => item.path === absolute)) {
          return current
        }

        return {
          ...current,
          localRoots: [
            ...current.localRoots,
            { id: absolute.toLowerCase(), path: absolute, addedAt: nowIso() },
          ],
        }
      })

      return { success: 'Added local source.' }
    }),
  removeLocalRoot: base
    .input(z.object({ id: z.string().min(1) }))
    .output(successResponseSchema)
    .handler(async ({ input }) => {
      await updateFindConfig((current) => ({
        ...current,
        localRoots: current.localRoots.filter((item) => item.id !== input.id),
      }))
      return { success: 'Removed local source.' }
    }),
}
