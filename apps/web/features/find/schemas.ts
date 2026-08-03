import { z } from 'zod'

export const searchModeSchema = z.enum(['literal', 'regex'])

export const searchRpcInputSchema = z.object({
  query: z.string().trim().min(1, 'Missing query.'),
  mode: searchModeSchema.default('literal'),
  caseSensitive: z.boolean().default(false),
  pathGlob: z.string().default(''),
})

export const searchLineSchema = z.object({
  lineNumber: z.number(),
  lineText: z.string(),
  kind: z.enum(['match', 'context']),
  matchRanges: z
    .array(z.object({ start: z.number(), end: z.number() }))
    .optional(),
})

export const searchClusterSchema = z.object({
  lines: z.array(searchLineSchema),
})

export const searchFileSchema = z.object({
  relativePath: z.string(),
  absolutePath: z.string(),
  matchCount: z.number(),
  clusters: z.array(searchClusterSchema),
})

const sourceRefSchema = z.object({ id: z.string(), label: z.string() })

export const searchGroupSchema = z.object({
  sourceId: z.string(),
  sourceLabel: z.string(),
  projectName: z.string(),
  sourceKind: z.enum(['local', 'github']),
  files: z.array(searchFileSchema),
  matchCount: z.number(),
})

export const searchResponseSchema = z.object({
  groups: z.array(searchGroupSchema),
  totalMatches: z.number(),
  missingSources: z.array(sourceRefSchema),
})

export const gitHubRepoPickSchema = z.object({
  id: z.string(),
  owner: z.string(),
  repo: z.string(),
  selected: z.boolean(),
})

export const gitHubLookupOutputSchema = z.object({
  repos: z.array(gitHubRepoPickSchema),
})

export const syncGitHubReposModeSchema = z.enum(['stale', 'force'])

export const syncGitHubReposInputSchema = z.object({
  mode: syncGitHubReposModeSchema,
  ids: z.array(z.string().min(1)).optional(),
})

export const syncResultSchema = z.object({
  id: z.string(),
  ok: z.boolean(),
  message: z.string(),
})

export type SearchMode = z.infer<typeof searchModeSchema>
export type SearchRpcInput = z.infer<typeof searchRpcInputSchema>
export type SearchLine = z.infer<typeof searchLineSchema>
export type SearchCluster = z.infer<typeof searchClusterSchema>
export type SearchFile = z.infer<typeof searchFileSchema>
export type SearchGroup = z.infer<typeof searchGroupSchema>
export type SearchResponse = z.infer<typeof searchResponseSchema>
export type GitHubRepoPick = z.infer<typeof gitHubRepoPickSchema>
export type SyncGitHubReposInput = z.infer<typeof syncGitHubReposInputSchema>
export type SyncResult = z.infer<typeof syncResultSchema>
