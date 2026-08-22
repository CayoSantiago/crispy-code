import { Button } from '@repo/ui/components/button'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { AuthShell } from '@/features/auth/components/auth-shell'
import { VerifyEmailForm } from '@/features/auth/components/verify-email-form'
import { getSession } from '@/features/auth/session'

export const metadata: Metadata = {
  title: 'Verify email',
  description: 'Check your inbox to verify your Crispy Code account.',
}

async function VerifyEmailContent() {
  const session = await getSession()
  const email = session?.user.email

  return (
    <>
      <VerifyEmailForm email={email} showEmailField={!email} />
      {session?.session ? (
        <Button
          variant='outline'
          nativeButton={false}
          render={<Link href='/' />}
        >
          Continue
        </Button>
      ) : (
        <Button
          variant='outline'
          nativeButton={false}
          render={<Link href='/login' />}
        >
          Back to sign in
        </Button>
      )}
    </>
  )
}

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title='Check your email'
      description='We sent a verification link. Open it to finish setting up your account.'
    >
      <Suspense>
        <VerifyEmailContent />
      </Suspense>
    </AuthShell>
  )
}
