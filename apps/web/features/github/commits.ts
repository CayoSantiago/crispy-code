import { cacheLife, cacheTag } from 'next/cache'
import { fetchGitHub, type GitHubResult } from './client'
import {
  gitHubCommitDetailSchema,
  gitHubCommitListSchema,
  gitHubRepoSchema,
} from './schemas'
import type {
  GitHubCommitDetail,
  GitHubCommitSummary,
  GitHubRepo,
} from './types'

export const COMMITS_PER_PAGE = 30

function repoPath(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
}

export async function getRepo(
  owner: string,
  repo: string,
): Promise<GitHubResult<GitHubRepo>> {
  'use cache'
  cacheTag(`repo:${owner}/${repo}`)

  const result = await fetchGitHub(repoPath(owner, repo), gitHubRepoSchema)

  if (result.status === 'ok') {
    cacheLife('minutes')
  } else {
    // Never hold a failure for long: the condition that caused it is transient.
    cacheLife('seconds')
  }

  return result
}

export async function getCommits(
  owner: string,
  repo: string,
  page: number,
): Promise<GitHubResult<GitHubCommitSummary[]>> {
  'use cache'
  cacheTag(`repo:${owner}/${repo}`)

  const result = await fetchGitHub(
    `${repoPath(owner, repo)}/commits?per_page=${COMMITS_PER_PAGE}&page=${page}`,
    gitHubCommitListSchema,
  )

  if (result.status === 'ok') {
    cacheLife('minutes')
  } else {
    cacheLife('seconds')
  }

  return result
}

export async function getCommit(
  owner: string,
  repo: string,
  sha: string,
): Promise<GitHubResult<GitHubCommitDetail>> {
  'use cache'
  cacheTag(`repo:${owner}/${repo}`)

  const result = await fetchGitHub(
    `${repoPath(owner, repo)}/commits/${encodeURIComponent(sha)}`,
    gitHubCommitDetailSchema,
  )
  if (result.status === 'ok') {
    // A commit addressed by SHA is immutable, so it can be cached indefinitely.
    cacheLife('max')
  } else {
    cacheLife('seconds')
  }

  return result
}
