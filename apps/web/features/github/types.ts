import type { z } from 'zod'
import type {
  gitHubCommitDetailSchema,
  gitHubCommitFileSchema,
  gitHubCommitSummarySchema,
  gitHubRepoLookupItemSchema,
  gitHubRepoSchema,
} from './schemas'

export type GitHubRepo = z.infer<typeof gitHubRepoSchema>
export type GitHubCommitSummary = z.infer<typeof gitHubCommitSummarySchema>
export type GitHubCommitFile = z.infer<typeof gitHubCommitFileSchema>
export type GitHubCommitFileStatus = GitHubCommitFile['status']
export type GitHubCommitDetail = z.infer<typeof gitHubCommitDetailSchema>
export type GitHubRepoLookupItem = z.infer<typeof gitHubRepoLookupItemSchema>
