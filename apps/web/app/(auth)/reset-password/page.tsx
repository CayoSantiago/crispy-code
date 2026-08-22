import { FieldDescription } from '@repo/ui/components/field'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { AuthShell } from '@/features/auth/components/auth-shell'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Choose a new Crispy Code password.',
}

function tokenFromSearchParams(
  token: string | string[] | undefined,
): string | undefined {
  if (typeof token === 'string' && token.length > 0) {
    return token
  }

  if (
    Array.isArray(token) &&
    typeof token[0] === 'string' &&
    token[0].length > 0
  ) {
    return token[0]
  }

  return undefined
}

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: PageProps<'/reset-password'>['searchParams']
}) {
  const params = await searchParams
  const token = tokenFromSearchParams(params.token)

  if (!token) {
    return (
      <FieldDescription className='text-center'>
        This reset link is invalid or has expired.{' '}
        <Link className='hover:text-foreground!' href='/forgot-password'>
          Request a new one
        </Link>
        .
      </FieldDescription>
    )
  }

  return <ResetPasswordForm token={token} />
}

export default function ResetPasswordPage({
  searchParams,
}: PageProps<'/reset-password'>) {
  return (
    <AuthShell
      title='Reset password'
      description='Choose a new password for your account'
    >
      <Suspense
        fallback={
          <FieldDescription className='text-center'>
            Loading...
          </FieldDescription>
        }
      >
        <ResetPasswordContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  )
}
