import { z } from 'zod'

export const searchModeSchema = z.enum(['literal', 'regex'])

export const searchRpcInputSchema = z.object({
  query: z.string().trim().min(1, 'Missing query.'),
  mode: searchModeSchema.default('literal'),
  caseSensitive: z.boolean().default(false),
  pathGlob: z.string().default(''),
})

export const searchMatchSchema = z.object({
  sourceId: z.string(),
  sourceLabel: z.string(),
  sourceKind: z.enum(['local', 'github']),
  absolutePath: z.string(),
  relativePath: z.string(),
  lineNumber: z.number(),
  lineText: z.string(),
  matchRanges: z.array(z.object({ start: z.number(), end: z.number() })),
  projectName: z.string(),
})

const sourceRefSchema = z.object({ id: z.string(), label: z.string() })

export const searchGroupSchema = z.object({
  sourceId: z.string(),
  sourceLabel: z.string(),
  projectName: z.string(),
  sourceKind: z.enum(['local', 'github']),
  matches: z.array(searchMatchSchema),
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

export const syncResultSchema = z.object({
  id: z.string(),
  ok: z.boolean(),
  message: z.string(),
})

export type SearchMode = z.infer<typeof searchModeSchema>
export type SearchRpcInput = z.infer<typeof searchRpcInputSchema>
export type SearchMatch = z.infer<typeof searchMatchSchema>
export type SearchResponse = z.infer<typeof searchResponseSchema>
export type GitHubRepoPick = z.infer<typeof gitHubRepoPickSchema>
export type SyncResult = z.infer<typeof syncResultSchema>
