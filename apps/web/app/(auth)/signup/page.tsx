import { enabledSocialProviders } from '@repo/auth/config'
import { FieldSeparator } from '@repo/ui/components/field'
import type { Metadata } from 'next'
import { AuthShell } from '@/features/auth/components/auth-shell'
import { OAuthButtons } from '@/features/auth/components/oauth-buttons'
import { SignupForm } from '@/features/auth/components/signup-form'

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create a Crispy Code account.',
}

export default function SignupPage() {
  const providers = enabledSocialProviders()

  return (
    <AuthShell
      title='Create an account'
      description='Enter your information below to create your account'
      showTerms
    >
      <OAuthButtons providers={providers} actionLabel='Sign up' />

      <FieldSeparator className='*:data-[slot=field-separator-content]:bg-card first:hidden'>
        Or continue with
      </FieldSeparator>

      <SignupForm />
    </AuthShell>
  )
}
