# Zod schema validation at untrusted boundaries

## Problem

Every untrusted data boundary in `apps/web` is validated by hand or not at all. GitHub API responses are cast with `as T` in `lib/github/client.ts`, the search client casts with `as Promise<SearchResponse>`, the disk config is normalized by manual `typeof` checks, ripgrep JSON lines are cast to `RgMatchEvent`, and route/action inputs use ad-hoc coercion. Hand-written interfaces and runtime behavior can silently drift, and malformed external data surfaces as confusing downstream errors instead of a clear failure at the boundary.

## Goals

- Validate every untrusted boundary with zod: the search API route, server actions, GitHub API responses, disk config, ripgrep output, page params/searchParams, and environment variables.
- Derive types from schemas (`z.infer`) so types and runtime validation cannot drift.
- No behavior changes for valid data.

## Scope and decisions

- Approach: colocated schemas inside `apps/web`. Each boundary owns its schema next to the code that uses it. No shared schema package, no changes to `@repo/ui`.
- GitHub schemas validate only the fields the app actually uses. Zod object schemas ignore unknown keys by default, so GitHub adding fields never breaks the app; a missing or mistyped used field throws a descriptive error.
- Existing domain logic stays: `parseRepoInput` keeps handling "is a valid repo reference"; schemas handle shape and type. The path-allowlist security check in `find/file/page.tsx` stays as-is on top of param validation.

## Dependencies (apps/web)

- `zod` `^4.4.3` (matching the version already in `@repo/ui`; currently unused there).

## Boundaries

### 1. Search API route and client

Shared schemas in `lib/find/` used by both sides of the wire:

- `searchRequestSchema` — `query` non-empty string, `mode` enum (`regex` | `literal`), `caseSensitive`/`wholeWord` coerced from `'true'`/`'false'` strings, optional `extension`, `pathFilter`, `sourceFilter`.
- `searchResponseSchema` — replaces the hand-written `SearchResponse` type; `SearchResponse` becomes `z.infer` of it.

`app/api/find/search/route.ts` parses `searchParams` with `safeParse` and returns 400 with the issue list on failure, replacing the ad-hoc coercion. `lib/find/search-client.ts` validates the response body with `searchResponseSchema` instead of casting.

### 2. Server actions

Each action in `app/git/actions.ts` and `app/find/actions.ts` gets an input schema validated with `safeParse` at the top of the action. Failures return the action's existing error-state shape (message derived from the issues), so `useActionState`/`useMutation` consumers keep working unchanged. `FormData` fields are extracted then validated; string/object arguments are validated directly.

### 3. GitHub client

`fetchGitHub<T>(path)` in `lib/github/client.ts` becomes `fetchGitHub(path, schema)`: it fetches, then parses the JSON with the given schema. On mismatch it returns `{ status: 'error', message }` with the path and issue summary — preserving the client's documented never-throws contract; page consumers already throw on error status, and the lookup action renders it as UI. Schemas live in `lib/github/` and cover `GitHubRepo`, `GitHubCommitSummary`, `GitHubCommitDetail`, and the user/org repo-list responses used by `app/find/actions.ts` — used fields only. The hand-written interfaces in `lib/github/types.ts` are replaced by inferred types.

### 4. Disk config

A `findConfigSchema` in `lib/find/config.ts` replaces `normalizeConfig`. Reading `~/.crispy-code/config.json` becomes `JSON.parse` + `safeParse`; on unparseable or invalid content, log a warning and return the default config — the same recovery behavior as today. `FindConfig` becomes an inferred type.

### 5. Ripgrep output

In `lib/find/search.ts`, a schema for the rg `--json` `match` event (the only event type the app consumes) replaces the `as RgMatchEvent` cast in `parseJsonLine`. Each stdout line is `safeParse`d; non-`match` and malformed lines are skipped so one bad event cannot fail a whole search — the same skip behavior as today, but validating the full shape instead of just `type`.

### 6. Page params and searchParams

Small colocated schemas with fallback behavior matching today:

- `components/git/commit-list.tsx` — `page` as coerced positive integer, default 1 (replaces `toPageNumber`).
- `app/git/[owner]/[repo]/commit/[sha]/page.tsx` — `owner`/`repo` non-empty strings, `sha` hex string; invalid → `notFound()`.
- `app/find/file/page.tsx` — `path` non-empty string, `line` optional coerced positive integer; invalid `line` is ignored, missing/invalid `path` renders the existing empty state.

### 7. Environment variables

New `lib/env.ts` with a schema for `GITHUB_TOKEN` (optional non-empty string) and `HOME` (non-empty string), parsed once at module load. `lib/github/client.ts` and `app/find/file/page.tsx` import from it instead of reading `process.env` directly.

## Error handling

- Bad user input → 400 with issues (API route) or returned field errors (actions).
- Bad external data (GitHub) → descriptive error-status result, surfaced by existing error boundaries/mutation error states.
- Bad local state (disk config, rg lines) → recover with defaults or skip the line, plus a logged warning.
- Valid data flows exactly as before.

## Testing and verification

No test framework exists in the repo; verification is `pnpm check-types`, Biome lint, and manual checks against the dev server:

1. Git flow: connect a repo, browse commits with valid and invalid `page`/`sha` values.
2. Find flow: add/remove sources, search (literal and regex), open files with valid and tampered `path`/`line` params.
3. Search route returns 400 for a missing/empty `query` and for an invalid `mode`.
4. App still works with no `~/.crispy-code/config.json`, and with a deliberately corrupted one (warning logged, defaults used).
5. With `GITHUB_TOKEN` unset, GitHub requests still work unauthenticated.

## Implementation notes

- Read the bundled Next.js 16 docs (`node_modules/next/dist/docs/`) before touching route handlers, server actions, or pages; this Next version differs from training data (for example, `params`/`searchParams` are Promises).
- Zod 4 API differs from zod 3 (for example `z.enum`, error customization, and coercion details); consult current zod 4 docs rather than memory where unsure.
