import { z } from 'zod/v4'
import { resilientArray } from '@/lib/schemas'

export const gitHubRepoSourceSchema = z.object({
  id: z.string(),
  owner: z.string(),
  repo: z.string(),
  selectedAt: z.string(),
  syncError: z.string().nullable(),
  syncedAt: z.string().nullable(),
})

export const localRootSourceSchema = z.object({
  id: z.string(),
  path: z.string(),
  addedAt: z.string(),
})

export const findConfigSchema = z.object({
  localRoots: resilientArray(localRootSourceSchema),
  // Retained only so existing web config files remain readable.
  githubRepos: resilientArray(gitHubRepoSourceSchema),
})

export type FindConfig = z.infer<typeof findConfigSchema>
export type LocalRootSource = z.infer<typeof localRootSourceSchema>
