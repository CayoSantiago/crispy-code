import type { NextRequest } from 'next/server'
import type { SearchOptions } from '@/lib/find/search'
import { executeSearch } from '@/lib/find/search-service'

export async function GET(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json(
      { error: 'Cross-site requests are not allowed.' },
      { status: 403 },
    )
  }

  const params = request.nextUrl.searchParams
  const query = params.get('query')?.trim() ?? ''

  if (!query) {
    return Response.json({ error: 'Missing query parameter.' }, { status: 400 })
  }

  const options: SearchOptions = {
    query,
    mode: params.get('mode') === 'regex' ? 'regex' : 'literal',
    caseSensitive: params.get('caseSensitive') === 'true',
    wholeWord: params.get('wholeWord') === 'true',
    extension: params.get('extension') ?? '',
    pathFilter: params.get('pathFilter') ?? '',
    sourceFilter: params.get('sourceFilter') ?? '',
    maxResultsPerSource: 50,
  }

  try {
    return Response.json(await executeSearch(options, request.signal))
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
