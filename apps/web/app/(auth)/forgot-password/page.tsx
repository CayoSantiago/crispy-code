import type { Metadata } from 'next'
import { AuthShell } from '@/features/auth/components/auth-shell'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Reset your Crispy Code password.',
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title='Recover Password'
      description='Enter your email to receive a reset link'
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
