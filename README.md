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

Postgres 16 runs in Docker for development. Prisma lives in `packages/db` (`@repo/db`). Auth lives in `packages/auth` (`@repo/auth`) and uses Better Auth with the Prisma adapter.

```bash
cp .env.example .env
```

Copy `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and `INNGEST_DEV=1` into `apps/web/.env.local` (Next.js only loads env files from the app directory). You can keep `GITHUB_TOKEN` and OAuth client IDs in that file too.

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

`pnpm dev` does not start Docker. The app requires `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `RESEND_API_KEY`. `DATABASE_URL` is required once something imports `@repo/db` or `@repo/auth/server`.

## Transactional email (Inngest + Resend)

Auth verification and password-reset mail is queued through Inngest and sent with Resend. Templates and send functions live in `packages/email` (`@repo/email`). The Inngest client lives in `packages/jobs` (`@repo/jobs`). `apps/web` composes the `/api/inngest` handler. Inngest failed runs plus Replay are the dead-letter queue; `email_delivery` in Postgres records status and the Resend message id so retries do not double-send.

Local development:

```bash
pnpm dev
```

`pnpm dev` starts Next and the Inngest Dev Server together. Do not start a second CLI. If you need the Dev Server alone, run `pnpm inngest:dev`. Keep `INNGEST_DEV=1` in `apps/web/.env.local` only. The Resend test from-address `onboarding@resend.dev` only delivers to the email on the Resend account.

Preview templates:

```bash
pnpm --filter @repo/email email:dev
```

Production (Netlify) also needs `RESEND_API_KEY`, `EMAIL_FROM`, `INNGEST_EVENT_KEY`, and `INNGEST_SIGNING_KEY`. Enable the Inngest Netlify integration or rely on `netlify-plugin-inngest`, which syncs `/api/inngest` after each deploy. Deploy Previews use Inngest branch environments via `BRANCH`.

## Desktop Ask and Find

Ask and Find live in the Electron desktop app; the web app no longer hosts
`/ask` or `/find`. Put the Gemini key in `apps/desktop/.env.local`:

```bash
GEMINI_API_KEY=your_key_here
pnpm --filter desktop dev
```

Find searches local folders configured in `~/.crispy-code/config.json`. Ask
threads are stored locally in `~/.crispy-code/ask.sqlite`.

## Production database (Neon + Netlify)

Production uses Neon Postgres. Netlify runs `prisma migrate deploy` before each production build, and each Deploy Preview gets a copy-on-write Neon branch (`preview-pr-<PR number>`) that is migrated independently. Closing the PR deletes that branch and the Netlify Deploy Preview via GitHub Actions.

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

- **Production:** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, plus OAuth client IDs/secrets if you use GitHub or Google sign-in
- **Deploy Previews:** the same values, plus `NEON_API_KEY` and `NEON_PROJECT_ID`

Deploy Preview builds still receive the production `DATABASE_URL` so the plugin can read the database name and role. The plugin then overwrites both URLs to the preview branch before migrate and `next build`. Preview databases are snapshots of production data, including users. Preview and branch deploys do not send Resend mail, so those snapshots cannot email production users.

Add these GitHub Actions secrets so `.github/workflows/neon-preview-cleanup.yml` can clean up when a PR closes:

- `NEON_API_KEY` and `NEON_PROJECT_ID` — delete Neon branch `preview-pr-<N>`. Leftover branches count against Neon's branch limit.
- `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` — delete every Deploy Preview for that PR so `deploy-preview-<N>` 404s. `NETLIFY_SITE_ID` is the site API ID under **Site configuration → General → Site details**. Create `NETLIFY_AUTH_TOKEN` as a Netlify personal access token that can list and delete deploys.

For preview sign-in, add each Deploy Preview callback URL in the GitHub and Google OAuth consoles (`{DEPLOY_PRIME_URL}/api/auth/callback/github` and `{DEPLOY_PRIME_URL}/api/auth/callback/google`). The build plugin sets `BETTER_AUTH_URL` to `DEPLOY_PRIME_URL` on non-production deploys.
