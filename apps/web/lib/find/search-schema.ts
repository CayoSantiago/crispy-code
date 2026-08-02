import { z } from 'zod'

export const searchModeSchema = z.enum(['literal', 'regex'])

export const searchRequestSchema = z.object({
  query: z.string().trim().min(1, 'Missing query parameter.'),
  mode: searchModeSchema.default('literal'),
  caseSensitive: z.stringbool().default(false),
  wholeWord: z.stringbool().default(false),
  extension: z.string().default(''),
  pathFilter: z.string().default(''),
  sourceFilter: z.string().default(''),
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
  sourceOptions: z.array(sourceRefSchema),
  recentSearches: z.array(z.string()),
})

export type SearchMode = z.infer<typeof searchModeSchema>
export type SearchRequest = z.infer<typeof searchRequestSchema>
export type SearchMatch = z.infer<typeof searchMatchSchema>
export type SearchResponse = z.infer<typeof searchResponseSchema>
