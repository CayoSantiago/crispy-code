import type { SocialProviderId } from '@repo/auth/config'
import { Button } from '@repo/ui/components/button'
import GitHubIcon from '@/assets/icons/github.svg'
import GoogleIcon from '@/assets/icons/google.svg'
import { signInSocial } from '@/features/auth/actions'

const PROVIDER_COPY = {
  google: { label: 'Google', Icon: GoogleIcon },
  github: { label: 'GitHub', Icon: GitHubIcon },
} as const

export function OAuthButtons({
  providers,
  actionLabel,
}: {
  providers: SocialProviderId[]
  actionLabel: 'Login' | 'Sign up'
}) {
  if (!providers.length) return null

  return (
    <div className='grid auto-cols-fr grid-flow-col gap-[calc(var(--card-spacing)/2)]'>
      {providers.map((provider) => {
        const { label, Icon } = PROVIDER_COPY[provider]

        return (
          <form action={signInSocial} key={provider} className='w-full'>
            <input type='hidden' name='provider' value={provider} />
            <Button variant='outline' type='submit' className='w-full gap-1.5'>
              <Icon />
              {actionLabel} with {label}
            </Button>
          </form>
        )
      })}
    </div>
  )
}
