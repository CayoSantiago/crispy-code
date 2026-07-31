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
