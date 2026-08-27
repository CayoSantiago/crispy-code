import { z } from 'zod/v4'
import {
  searchGroupSchema,
  searchResponseSchema,
} from '@/features/find/schemas'

export const askIntentSchema = z.enum(['component', 'solution'])

export const plannedSearchSchema = z.object({
  query: z.string().trim().min(1),
  pathGlob: z.string().default(''),
  mode: z.enum(['literal', 'regex']),
})

export const searchPlanSchema = z.object({
  intent: askIntentSchema,
  searches: z.array(plannedSearchSchema).min(1).max(3),
})

export const askHistoryTurnSchema = z.object({
  question: z.string(),
  answer: z.string(),
})

export const askTurnStatusSchema = z.enum(['RUNNING', 'COMPLETED', 'FAILED'])
export const askSearchStageSchema = z.enum(['PLANNING', 'SEARCHING', 'WRITING'])

export const askTurnSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string().nullable(),
  intent: askIntentSchema.nullable(),
  plannedQueries: z.array(plannedSearchSchema),
  usedFallbackPlan: z.boolean(),
  groups: z.array(searchGroupSchema),
  totalMatches: z.number(),
  missingSources: searchResponseSchema.shape.missingSources,
  searchStage: askSearchStageSchema.nullable(),
  status: askTurnStatusSchema,
  error: z.string().nullable(),
  createdAt: z.string(),
})

export const askThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  turns: z.array(askTurnSchema),
})

export const askThreadSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
})

export const askRenameThreadInputSchema = z.object({
  threadId: z.string().min(1),
  title: z.string().trim().min(1).max(80),
})

export const askRenameThreadOutputSchema = z.object({
  ok: z.literal(true),
})

export const askStartInputSchema = z.object({
  question: z.string().trim().min(1, 'Ask a question about your local code.'),
  threadId: z.string().min(1).optional(),
})

export const askStartOutputSchema = z.object({
  threadId: z.string(),
  turnId: z.string(),
})

export const askStatusOutputSchema = z.object({
  geminiConfigured: z.boolean(),
})

export type AskIntent = z.infer<typeof askIntentSchema>
export type PlannedSearch = z.infer<typeof plannedSearchSchema>
export type SearchPlan = z.infer<typeof searchPlanSchema>
export type AskHistoryTurn = z.infer<typeof askHistoryTurnSchema>
export type AskSearchStage = z.infer<typeof askSearchStageSchema>
export type AskTurn = z.infer<typeof askTurnSchema>
export type AskThread = z.infer<typeof askThreadSchema>
export type AskThreadSummary = z.infer<typeof askThreadSummarySchema>
