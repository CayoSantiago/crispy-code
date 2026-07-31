export type GitHubRepo = {
  default_branch: string
  description: string | null
  full_name: string
  html_url: string
  stargazers_count: number
}

export type GitHubCommitSummary = {
  author: { avatar_url: string; login: string } | null
  commit: {
    author: { date: string; name: string } | null
    message: string
  }
  html_url: string
  sha: string
}

export type GitHubCommitFileStatus =
  | 'added'
  | 'changed'
  | 'copied'
  | 'modified'
  | 'removed'
  | 'renamed'
  | 'unchanged'

export type GitHubCommitFile = {
  additions: number
  deletions: number
  filename: string
  /** Absent for binary files and for diffs GitHub considers too large. */
  patch?: string
  previous_filename?: string
  status: GitHubCommitFileStatus
}

export type GitHubCommitDetail = GitHubCommitSummary & {
  files?: GitHubCommitFile[]
  stats?: { additions: number; deletions: number; total: number }
}
