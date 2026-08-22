import { env } from '@repo/env/server'

export const SOCIAL_PROVIDER_IDS = ['google', 'github'] as const
export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number]

export function socialProviders() {
  return {
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  }
}

export function enabledSocialProviders(): SocialProviderId[] {
  const providers = socialProviders()
  return SOCIAL_PROVIDER_IDS.filter((id) => id in providers)
}
