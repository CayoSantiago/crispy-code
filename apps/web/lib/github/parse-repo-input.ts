export type ParsedRepoInput =
  | { ok: false; error: string }
  | { ok: true; owner: string; repo: string }

const VALID_SEGMENT = /^[\w.-]+$/

/**
 * Accepts a GitHub HTTPS URL, an SSH remote, or a bare owner/repo pair.
 * Extra path segments are ignored, so a URL copied from a branch or file view
 * still resolves to the repository.
 */
export function parseRepoInput(input: string): ParsedRepoInput {
  const trimmed = input.trim()

  if (!trimmed) {
    return { ok: false, error: 'Enter a repository.' }
  }

  const withoutHost = trimmed
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^git@github\.com:/i, '')
    .replace(/^github\.com\//i, '')

  const segments = withoutHost
    .replace(/\.git(\/)?$/i, '')
    .replace(/\/+$/, '')
    .split('/')

  const [owner, repo] = segments

  if (!owner || !repo) {
    return {
      ok: false,
      error: 'Use a GitHub URL or owner/repo, for example vercel/next.js.',
    }
  }

  if (!VALID_SEGMENT.test(owner) || !VALID_SEGMENT.test(repo)) {
    return {
      ok: false,
      error:
        'Owner and repository may only contain letters, numbers, dots, hyphens, and underscores.',
    }
  }

  return { ok: true, owner, repo }
}
