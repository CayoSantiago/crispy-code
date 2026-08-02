import type { NextRequest } from 'next/server'
import { searchRequestSchema } from '@/features/find/schemas'
import { executeSearch } from '@/features/find/service'
import { formatIssues } from '@/lib/validation'

export async function GET(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json(
      { error: 'Cross-site requests are not allowed.' },
      { status: 403 },
    )
  }

  const parsed = searchRequestSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  )

  if (!parsed.success) {
    return Response.json(
      { error: formatIssues(parsed.error), issues: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    return Response.json(
      await executeSearch(
        { ...parsed.data, maxResultsPerSource: 50 },
        request.signal,
      ),
    )
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Search failed unexpectedly.',
      },
      { status: 500 },
    )
  }
}
