import { createNeonApi, resolveDatabaseEnv } from '#neon-preview'

const result = await resolveDatabaseEnv({
  context: process.env.CONTEXT,
  reviewId: process.env.REVIEW_ID,
  env: process.env,
  neon: process.env.NEON_API_KEY
    ? createNeonApi(process.env.NEON_API_KEY)
    : undefined,
})

process.stdout.write(`${JSON.stringify(result)}\n`)
