import 'server-only'

import { prismaAdapter } from '@better-auth/prisma-adapter'
import { db } from '@repo/db'
import { env } from '@repo/env/server'
import { betterAuth } from 'better-auth'
import { socialProviders } from '#config'

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: socialProviders(),
})

export type Session = typeof auth.$Infer.Session
