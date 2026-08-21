import { prismaAdapter } from '@better-auth/prisma-adapter'
import type { PrismaClient } from '@repo/db/client'
import { betterAuth } from 'better-auth'

function optionalEnv(name: string) {
  const value = process.env[name]?.trim()
  return value?.length ? value : undefined
}

function socialProviders() {
  const githubClientId = optionalEnv('GITHUB_CLIENT_ID')
  const githubClientSecret = optionalEnv('GITHUB_CLIENT_SECRET')
  const googleClientId = optionalEnv('GOOGLE_CLIENT_ID')
  const googleClientSecret = optionalEnv('GOOGLE_CLIENT_SECRET')

  return {
    ...(githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          },
        }
      : {}),
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
  }
}

export function createAuth(prisma: PrismaClient) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: socialProviders(),
  })
}
