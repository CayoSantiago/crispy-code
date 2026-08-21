# shadcn/ui monorepo template

This is a Next.js monorepo template with shadcn/ui.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@repo/ui/components/button";
```

## Git commit viewer

Visit `/git` to connect a public GitHub repository and browse its commits, with
each commit's per-file diff rendered through the `CodeBlock` component.

Requests go to the GitHub REST API unauthenticated, which GitHub limits to 60 per
hour per IP address. Responses are cached, but to raise the limit to 5,000 per
hour create `apps/web/.env.local` with a token that needs no scopes for public
repositories:

```bash
GITHUB_TOKEN=ghp_your_token_here
```

The token is optional; the feature works without it.

## Local database

Postgres 16 runs in Docker for development. Prisma lives in `packages/db` (`@repo/db`). Auth lives in `packages/auth` (`@repo/auth`) and uses Better Auth with the Prisma adapter. Find config still lives in `~/.crispy-code/config.json`.

```bash
cp .env.example .env
```

Copy `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` into `apps/web/.env.local` (Next.js only loads env files from the app directory). You can keep `GITHUB_TOKEN` and OAuth client IDs in that file too.

GitHub and Google sign-in stay off until both the client ID and secret for that provider are set. OAuth callback URLs are `{BETTER_AUTH_URL}/api/auth/callback/github` and `{BETTER_AUTH_URL}/api/auth/callback/google`. `GITHUB_TOKEN` is still only for the GitHub REST client; it is not the GitHub OAuth app secret.

```bash
pnpm db:up
pnpm db:migrate
pnpm db:ping
```

- `pnpm db:up` starts Postgres and waits until it is healthy (`localhost:5432`).
- `pnpm db:migrate` applies Prisma migrations.
- `pnpm db:ping` runs `SELECT 1` to confirm connectivity.
- `pnpm db:studio` opens Prisma Studio.
- `pnpm db:down` stops the container (the data volume is kept).

`pnpm dev` does not start Docker. The app requires `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. `DATABASE_URL` is required once something imports `@repo/db` or `@repo/auth/server`.

## Production database (Neon + Netlify)

Production uses Neon Postgres. Netlify runs `prisma migrate deploy` before each production build, and each Deploy Preview gets a copy-on-write Neon branch (`preview-pr-<PR number>`) that is migrated independently. Closing the PR deletes that branch via GitHub Actions.

Local Docker is unchanged: `pnpm db:up` and `pnpm db:migrate` still use a single `DATABASE_URL`.

### Connection strings

In the Neon console, open **Connect** and copy both URLs (`sslmode=require`):

- **Pooled** (`-pooler` in the hostname) → `DATABASE_URL` (app runtime)
- **Direct** (no `-pooler`) → `DATABASE_URL_UNPOOLED` (Prisma migrations)

Prisma Migrate cannot run through Neon's pooler.

### Netlify UI

- Base directory: empty (repository root) so pnpm workspaces install correctly
- Package directory: `apps/web`
- Branch deploys: off
- Deploy Previews: on

Set these environment variables:

- **Production:** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, plus OAuth client IDs/secrets if you use GitHub or Google sign-in
- **Deploy Previews:** the same values, plus `NEON_API_KEY` and `NEON_PROJECT_ID`

Deploy Preview builds still receive the production `DATABASE_URL` so the plugin can read the database name and role. The plugin then overwrites both URLs to the preview branch before migrate and `next build`. Preview databases are snapshots of production data, including users.

Add `NEON_API_KEY` and `NEON_PROJECT_ID` as GitHub Actions secrets so `.github/workflows/neon-preview-cleanup.yml` can delete `preview-pr-<N>` when a PR closes. Leftover branches count against Neon's branch limit.

For preview sign-in, add each Deploy Preview callback URL in the GitHub and Google OAuth consoles (`{DEPLOY_PRIME_URL}/api/auth/callback/github` and `{DEPLOY_PRIME_URL}/api/auth/callback/google`). The build plugin sets `BETTER_AUTH_URL` to `DEPLOY_PRIME_URL` on non-production deploys.

## Code Finder

Visit `/find` to search code snippets across:

- local project folders you add manually, and
- selected GitHub repositories synced as shallow local mirrors.

Search runs with `ripgrep` and respects each project's `.gitignore` entries.

### Notes

- GitHub mirrors live under `~/.crispy-code/repos` and refresh automatically when you select a repo or revisit `/find` (at most once per hour per repo).
- App config is stored in `~/.crispy-code/config.json`.
- Failed mirrors can be retried from the Sources → GitHub tab.
- `GITHUB_TOKEN` is optional but helps avoid low unauthenticated rate limits.
