import { z } from 'zod'

export const gitHubRepoSchema = z.object({
  default_branch: z.string(),
  description: z.string().nullable(),
  full_name: z.string(),
  html_url: z.string(),
  stargazers_count: z.number(),
})

export const gitHubCommitSummarySchema = z.object({
  author: z.object({ avatar_url: z.string(), login: z.string() }).nullable(),
  commit: z.object({
    author: z.object({ date: z.string(), name: z.string() }).nullable(),
    message: z.string(),
  }),
  html_url: z.string(),
  sha: z.string(),
})

export const gitHubCommitListSchema = z.array(gitHubCommitSummarySchema)

export const gitHubCommitFileSchema = z.object({
  additions: z.number(),
  deletions: z.number(),
  filename: z.string(),
  /** Absent for binary files and for diffs GitHub considers too large. */
  patch: z.string().optional(),
  previous_filename: z.string().optional(),
  status: z.enum([
    'added',
    'changed',
    'copied',
    'modified',
    'removed',
    'renamed',
    'unchanged',
  ]),
})

export const gitHubCommitDetailSchema = gitHubCommitSummarySchema.extend({
  files: z.array(gitHubCommitFileSchema).optional(),
  stats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
      total: z.number(),
    })
    .optional(),
})

export const gitHubRepoLookupItemSchema = z.object({
  full_name: z.string(),
  name: z.string(),
  owner: z.object({ login: z.string() }),
})

export const gitHubRepoLookupListSchema = z.array(gitHubRepoLookupItemSchema)
