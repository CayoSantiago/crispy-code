import 'server-only'

import { env } from '@repo/env/server'
import { render } from 'react-email'
import { Resend } from 'resend'
import { getDelivery } from '#delivery'
import { throwForResendError } from '#errors'
import { type EmailSendPayload, emailSubjects } from '#schema'
import { EmailVerificationEmail } from '#templates/email-verification'
import { PasswordResetEmail } from '#templates/password-reset'

const resend = new Resend(env.RESEND_API_KEY)

async function renderEmail(payload: EmailSendPayload) {
  const element =
    payload.type === 'password-reset'
      ? PasswordResetEmail(payload.props)
      : EmailVerificationEmail(payload.props)

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])

  return {
    html,
    text,
    subject: emailSubjects[payload.type],
  }
}

export async function sendEmail(payload: EmailSendPayload) {
  const existing = await getDelivery(payload.idempotencyKey)
  if (existing?.status === 'SENT' && existing.providerMessageId) {
    return { providerMessageId: existing.providerMessageId, skipped: true }
  }

  const { html, text, subject } = await renderEmail(payload)
  const { data, error } = await resend.emails.send(
    {
      from: env.EMAIL_FROM,
      to: payload.to,
      subject,
      html,
      text,
    },
    { idempotencyKey: payload.idempotencyKey },
  )

  if (error) throwForResendError(error)
  if (!data?.id) throw new Error('Resend did not return a message id')

  return { providerMessageId: data.id, skipped: false }
}
