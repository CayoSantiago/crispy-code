import type { z } from 'zod'
import { env } from '@/lib/env'
import { formatIssues } from '@/lib/validation'

export type GitHubResult<T> =
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ok'; data: T }
  | { status: 'rate-limited'; resetAt: Date | null }

const API_BASE = 'https://api.github.com'

function resetAtFrom(headers: Headers): Date | null {
  const reset = headers.get('x-ratelimit-reset')

  if (!reset) {
    return null
  }

  const epochSeconds = Number(reset)

  return Number.isFinite(epochSeconds) ? new Date(epochSeconds * 1000) : null
}

/**
 * Single entry point for GitHub REST calls. Never throws: callers inspect
 * `status` so that expected conditions such as rate limiting can render as UI
 * instead of hitting an error boundary.
 */
export async function fetchGitHub<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<GitHubResult<T>> {
  const token = env.GITHUB_TOKEN

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (response.ok) {
      const parsed = schema.safeParse(await response.json())

      if (!parsed.success) {
        return {
          status: 'error',
          message: `GitHub response for ${path} failed validation: ${formatIssues(parsed.error)}`,
        }
      }

      return { status: 'ok', data: parsed.data }
    }

    // GitHub answers an unknown commit SHA with 422 "No commit found for SHA"
    // rather than 404, so both mean the caller asked for something absent.
    if (response.status === 404 || response.status === 422) {
      return { status: 'not-found' }
    }

    if (
      (response.status === 403 || response.status === 429) &&
      response.headers.get('x-ratelimit-remaining') === '0'
    ) {
      return { status: 'rate-limited', resetAt: resetAtFrom(response.headers) }
    }

    return {
      status: 'error',
      message: `GitHub responded with ${response.status}`,
    }
  } catch (cause) {
    return {
      status: 'error',
      message:
        cause instanceof Error ? cause.message : 'Network request failed',
    }
  }
}
