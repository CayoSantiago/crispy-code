import type { ReactElement } from 'react'
import type { EmailSendPayload, EmailType } from '#schema'
import { EmailVerificationEmail } from '#templates/email-verification'
import { PasswordResetEmail } from '#templates/password-reset'

export const emailSubjects: Record<EmailType, string> = {
  'password-reset': 'Reset your password',
  'email-verification': 'Verify your email address',
}

const renderers: {
  [K in EmailType]: (
    payload: Extract<EmailSendPayload, { type: K }>,
  ) => ReactElement
} = {
  'password-reset': (payload) => PasswordResetEmail(payload.props),
  'email-verification': (payload) => EmailVerificationEmail(payload.props),
}

export function renderEmailTemplate(payload: EmailSendPayload) {
  switch (payload.type) {
    case 'password-reset':
      return renderers['password-reset'](payload)
    case 'email-verification':
      return renderers['email-verification'](payload)
  }
}
