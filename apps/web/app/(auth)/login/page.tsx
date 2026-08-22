import { enabledSocialProviders } from '@repo/auth/config'
import { FieldSeparator } from '@repo/ui/components/field'
import type { Metadata } from 'next'
import { AuthShell } from '@/features/auth/components/auth-shell'
import { LoginForm } from '@/features/auth/components/login-form'
import { OAuthButtons } from '@/features/auth/components/oauth-buttons'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Crispy Code account.',
}

export default function LoginPage() {
  const providers = enabledSocialProviders()

  const description = providers.length
    ? 'Login with your connected account'
    : 'Enter your email below to login to your account'

  return (
    <AuthShell title='Welcome back' description={description} showTerms>
      <OAuthButtons providers={providers} actionLabel='Login' />

      <FieldSeparator className='*:data-[slot=field-separator-content]:bg-card first:hidden'>
        Or continue with
      </FieldSeparator>

      <LoginForm />
    </AuthShell>
  )
}
