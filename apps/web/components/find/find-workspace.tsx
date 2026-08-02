'use client'

import { Button } from '@repo/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { Field, FieldError, FieldLabel } from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  CopyIcon,
  FolderSearchIcon,
  LoaderCircleIcon,
  Trash2Icon,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  addLocalRoot,
  getFindConfig,
  lookupGitHubRepos,
  removeLocalRoot,
  setGitHubRepoSelection,
} from '@/app/find/actions'
import { CopyButton } from '@/components/copy-button'
import { GitHubMirrorSyncCard } from '@/components/find/github-mirror-sync-card'
import { fetchSearchResults } from '@/features/find/client'
import type { FindConfig } from '@/features/find/config/schemas'
import { findKeys } from '@/features/find/keys'
import type { SearchResponse } from '@/features/find/schemas'
import type { SearchOptions } from '@/features/find/search'

const ALL_SOURCES_VALUE = '__all_sources__'
const emptyConfig: FindConfig = {
  localRoots: [],
  githubRepos: [],
  recentSearches: [],
}

function highlightMatchedText(
  input: string,
  ranges: Array<{ start: number; end: number }>,
) {
  if (!ranges.length) {
    return input
  }

  const parts: React.ReactNode[] = []
  let cursor = 0

  for (const [index, range] of ranges.entries()) {
    if (range.start > cursor) {
      parts.push(
        <span key={`plain-${index}-${cursor}`}>
          {input.slice(cursor, range.start)}
        </span>,
      )
    }

    parts.push(
      <mark
        key={`match-${index}-${range.start}`}
        className='bg-amber-200 text-foreground px-0.5 rounded-sm dark:bg-amber-700/70'
      >
        {input.slice(range.start, range.end)}
      </mark>,
    )

    cursor = range.end
  }

  if (cursor < input.length) {
    parts.push(<span key='plain-tail'>{input.slice(cursor)}</span>)
  }

  return parts
}

export function FindWorkspace() {
  const queryClient = useQueryClient()

  const configQuery = useQuery({
    queryKey: findKeys.config(),
    queryFn: getFindConfig,
  })

  const addLocalRootMutation = useMutation({
    mutationFn: (formData: FormData) => addLocalRoot(formData),
    onSuccess: async (result) => {
      if (!result.error) {
        await queryClient.invalidateQueries({ queryKey: findKeys.config() })
      }
    },
  })

  const removeLocalRootMutation = useMutation({
    mutationFn: (id: string) => removeLocalRoot(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: findKeys.config() })
      await queryClient.invalidateQueries({ queryKey: findKeys.searches() })
    },
  })

  const repoLookupMutation = useMutation({
    mutationFn: (owner: string) => lookupGitHubRepos(owner),
    onSuccess: (result) => {
      if (result.status !== 'ok') {
        if (result.status === 'rate-limited') {
          setRepoLookupError(
            result.resetAt
              ? `Rate limited until ${new Date(result.resetAt).toLocaleTimeString()}.`
              : 'Rate limited by GitHub. Try again soon.',
          )
        } else {
          setRepoLookupError(result.message ?? 'Could not load repositories.')
        }
        setRepoResults([])
        return
      }

      setRepoLookupError(null)
      setRepoResults(result.repos)
    },
  })

  const repoSelectionMutation = useMutation({
    mutationFn: ({
      repo,
      selected,
    }: {
      repo: { id: string; owner: string; repo: string }
      selected: boolean
    }) => setGitHubRepoSelection(repo, selected),
    onSuccess: async (_data, { repo, selected }) => {
      setRepoResults((current) =>
        current.map((item) =>
          item.id === repo.id ? { ...item, selected } : item,
        ),
      )
      await queryClient.invalidateQueries({ queryKey: findKeys.config() })
    },
  })

  const config = configQuery.data ?? emptyConfig
  const [repoOwner, setRepoOwner] = useState('')
  const [repoLookupError, setRepoLookupError] = useState<string | null>(null)
  const [repoResults, setRepoResults] = useState<
    Array<{ id: string; owner: string; repo: string; selected: boolean }>
  >([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchOptions['mode']>('literal')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [extension, setExtension] = useState('')
  const [pathFilter, setPathFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchQuery), 220)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const searchParams: SearchOptions = {
    query: debouncedQuery.trim(),
    mode: searchMode,
    caseSensitive,
    wholeWord,
    extension,
    pathFilter,
    sourceFilter,
    maxResultsPerSource: 50,
  }

  const searchResult = useQuery({
    queryKey: findKeys.search(searchParams),
    queryFn: ({ signal }) => fetchSearchResults(searchParams, signal),
    enabled: searchParams.query.length > 0,
    placeholderData: keepPreviousData,
  })

  const searchResponse: SearchResponse | null = searchQuery.trim()
    ? (searchResult.data ?? null)
    : null
  const isSearchPending = searchResult.isFetching

  const latestRecentSearches = searchResult.data?.recentSearches

  useEffect(() => {
    if (!latestRecentSearches) {
      return
    }

    queryClient.setQueryData<FindConfig>(findKeys.config(), (current) =>
      current ? { ...current, recentSearches: latestRecentSearches } : current,
    )
  }, [latestRecentSearches, queryClient])

  const hasNoSources =
    configQuery.isSuccess &&
    config.localRoots.length === 0 &&
    config.githubRepos.length === 0

  return (
    <>
      {configQuery.isError ? (
        <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs'>
          Failed to load your sources: {configQuery.error.message}
        </div>
      ) : null}
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-6'>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                const form = event.currentTarget
                addLocalRootMutation.mutate(new FormData(form), {
                  onSuccess: (result) => {
                    if (!result.error) {
                      form.reset()
                    }
                  },
                })
              }}
              className='grid gap-3'
            >
              <Field>
                <FieldLabel htmlFor='localPath'>Add local folder</FieldLabel>
                <Input
                  id='localPath'
                  name='localPath'
                  placeholder='~/Projects'
                  required
                  autoComplete='off'
                />
                {addLocalRootMutation.data?.error ? (
                  <FieldError>{addLocalRootMutation.data.error}</FieldError>
                ) : null}
              </Field>
              <Button type='submit' disabled={addLocalRootMutation.isPending}>
                {addLocalRootMutation.isPending
                  ? 'Adding...'
                  : 'Add local source'}
              </Button>
            </form>

            {config.localRoots.length ? (
              <div className='grid gap-2'>
                {config.localRoots.map((root) => (
                  <div
                    key={root.id}
                    className='flex items-center justify-between rounded-md border bg-card px-3 py-2'
                  >
                    <p className='font-mono text-xs break-all'>{root.path}</p>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      disabled={removeLocalRootMutation.isPending}
                      onClick={() => removeLocalRootMutation.mutate(root.id)}
                    >
                      <Trash2Icon />
                      <span className='sr-only'>Remove local source</span>
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className='grid gap-3'>
              <Field>
                <FieldLabel htmlFor='githubOwner'>
                  GitHub user or org
                </FieldLabel>
                <Input
                  id='githubOwner'
                  value={repoOwner}
                  onChange={(event) => setRepoOwner(event.target.value)}
                  placeholder='vercel'
                  autoCapitalize='none'
                  spellCheck={false}
                />
              </Field>
              <Button
                type='button'
                disabled={repoLookupMutation.isPending}
                onClick={() => {
                  setRepoLookupError(null)
                  repoLookupMutation.mutate(repoOwner)
                }}
              >
                {repoLookupMutation.isPending
                  ? 'Loading repos...'
                  : 'Load repositories'}
              </Button>
              {repoLookupError ? (
                <FieldError>{repoLookupError}</FieldError>
              ) : null}

              {repoResults.length ? (
                <div className='grid gap-2 max-h-64 overflow-auto rounded-md border p-2'>
                  {repoResults.map((repo) => (
                    <label
                      key={repo.id}
                      className='flex items-center justify-between gap-3 rounded-sm px-2 py-1.5 hover:bg-muted'
                    >
                      <span className='text-sm font-mono'>
                        {repo.owner}/{repo.repo}
                      </span>
                      <input
                        type='checkbox'
                        checked={repo.selected}
                        disabled={repoSelectionMutation.isPending}
                        onChange={(event) =>
                          repoSelectionMutation.mutate({
                            repo: {
                              id: repo.id,
                              owner: repo.owner,
                              repo: repo.repo,
                            },
                            selected: event.target.checked,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <GitHubMirrorSyncCard />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4'>
          {hasNoSources ? (
            <Empty className='border rounded-md'>
              <EmptyHeader>
                <EmptyTitle>Start by adding a source</EmptyTitle>
                <EmptyDescription>
                  Add a local folder or select GitHub repositories, then search
                  across all your code.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder='Search code...'
              autoComplete='off'
            />

            <Select
              value={searchMode}
              onValueChange={(value) =>
                setSearchMode(value as SearchOptions['mode'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='literal'>Literal search</SelectItem>
                <SelectItem value='regex'>Regex search</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sourceFilter || ALL_SOURCES_VALUE}
              onValueChange={(value) =>
                setSourceFilter(
                  value === ALL_SOURCES_VALUE ? '' : (value ?? ''),
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='All sources' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SOURCES_VALUE}>All sources</SelectItem>
                {searchResponse?.sourceOptions?.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={extension}
              onChange={(event) => setExtension(event.target.value)}
              placeholder='Extension filter (ts,tsx,py)'
            />

            <Input
              value={pathFilter}
              onChange={(event) => setPathFilter(event.target.value)}
              placeholder='Path contains...'
            />

            <div className='flex items-center gap-2 text-xs'>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='checkbox'
                  checked={caseSensitive}
                  onChange={(event) => setCaseSensitive(event.target.checked)}
                />
                Case sensitive
              </label>
              <label className='inline-flex items-center gap-1'>
                <input
                  type='checkbox'
                  checked={wholeWord}
                  onChange={(event) => setWholeWord(event.target.checked)}
                />
                Whole word
              </label>
            </div>
          </div>

          {config.recentSearches.length ? (
            <div className='flex flex-wrap gap-2 items-center'>
              <span className='text-xs text-muted-foreground'>Recent:</span>
              {config.recentSearches.map((recent) => (
                <Button
                  key={recent}
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={() => setSearchQuery(recent)}
                >
                  {recent}
                </Button>
              ))}
            </div>
          ) : null}

          {searchResponse?.missingSources.length ? (
            <div className='rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs'>
              Missing sources:{' '}
              {searchResponse.missingSources
                .map((source) => source.label)
                .join(', ')}
            </div>
          ) : null}

          {searchResult.error ? (
            <div className='rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs'>
              Search failed: {searchResult.error.message}
            </div>
          ) : null}

          {isSearchPending ? (
            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
              <LoaderCircleIcon className='size-3.5 animate-spin' />
              Searching...
            </div>
          ) : null}

          {!searchResponse && searchQuery ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Searching...</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : null}

          {searchResponse && searchResponse.totalMatches === 0 ? (
            <Empty className='border rounded-md'>
              <EmptyHeader>
                <EmptyTitle>No matches</EmptyTitle>
                <EmptyDescription>
                  Try broadening the query, removing filters, or syncing GitHub
                  repositories.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {searchResponse?.groups.map((group) => (
            <div
              key={`${group.sourceId}:${group.projectName}`}
              className='grid gap-2'
            >
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold'>
                  {group.projectName}{' '}
                  <span className='text-muted-foreground font-normal'>
                    ({group.matches.length})
                  </span>
                </h3>
                <span className='text-xs text-muted-foreground'>
                  {group.sourceLabel}
                </span>
              </div>
              <div className='grid gap-2'>
                {group.matches.slice(0, 10).map((match) => (
                  <div
                    key={`${match.absolutePath}:${match.lineNumber}`}
                    className='rounded-md border bg-card'
                  >
                    <div className='flex items-center justify-between border-b px-3 py-2'>
                      <Link
                        href={{
                          pathname: '/find/file',
                          query: {
                            path: match.absolutePath,
                            line: String(match.lineNumber),
                          },
                        }}
                        className='text-xs font-mono hover:underline underline-offset-4'
                      >
                        {match.relativePath}:{match.lineNumber}
                      </Link>

                      <div className='flex items-center gap-1'>
                        <CopyButton
                          copyText={match.lineText}
                          aria-label='Copy snippet'
                          size='icon-sm'
                        >
                          <CopyIcon />
                        </CopyButton>
                        <CopyButton
                          copyText={match.absolutePath}
                          aria-label='Copy path'
                          size='icon-sm'
                        >
                          <FolderSearchIcon />
                        </CopyButton>
                        <a
                          href={`cursor://file/${encodeURIComponent(
                            match.absolutePath,
                          )}:${match.lineNumber}`}
                          className='inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium shadow-xs hover:bg-accent'
                        >
                          Open in Cursor
                        </a>
                        <a
                          href={`vscode://file/${encodeURIComponent(
                            match.absolutePath,
                          )}:${match.lineNumber}`}
                          className='inline-flex items-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium shadow-xs hover:bg-accent'
                        >
                          Open in VS Code
                        </a>
                      </div>
                    </div>
                    <pre className='overflow-x-auto px-3 py-2 text-xs leading-relaxed'>
                      <code>
                        {highlightMatchedText(
                          match.lineText,
                          match.matchRanges,
                        )}
                      </code>
                    </pre>
                  </div>
                ))}
                {group.matches.length > 10 ? (
                  <p className='text-xs text-muted-foreground'>
                    Showing 10 of {group.matches.length} matches for this
                    project.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
