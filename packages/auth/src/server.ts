import 'server-only'

import { prismaAdapter } from '@better-auth/prisma-adapter'
import { db } from '@repo/db'
import { enqueueEmail } from '@repo/email/enqueue'
import { emailIdempotencyKey } from '@repo/email/schemas'
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
    sendResetPassword: async ({ user, url, token }) => {
      await enqueueEmail({
        type: 'password-reset',
        to: user.email,
        idempotencyKey: emailIdempotencyKey('password-reset', token),
        props: { name: user.name || user.email, url },
      })
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      await enqueueEmail({
        type: 'email-verification',
        to: user.email,
        idempotencyKey: emailIdempotencyKey('email-verification', token),
        props: { name: user.name || user.email, url },
      })
    },
  },

  socialProviders: socialProviders(),

  rateLimit: {
    storage: 'database',
  },

  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-nf-client-connection-ip', 'x-forwarded-for'],
    },
  },
})

export type Session = typeof auth.$Infer.Session
