import 'server-only'

import { env } from '@repo/env/server'
import { type LogSink, logTo } from '@repo/observability/logger'
import { render } from 'react-email'
import { Resend } from 'resend'
import { getDelivery, markSent } from '#delivery'
import { isAlreadySent } from '#delivery-state'
import { throwForResendError } from '#errors'
import type { EmailSendPayload } from '#schema'
import { isEmailSendingEnabled } from '#sending-enabled'
import { emailSubjects, renderEmailTemplate } from '#templates/registry'

const resend = new Resend(env.RESEND_API_KEY)

async function renderEmail(payload: EmailSendPayload) {
  const element = renderEmailTemplate(payload)
  const [html, text] = await Promise.all([
    render(element, { pretty: false }),
    render(element, { plainText: true, pretty: false }),
  ])

  return {
    html,
    text,
    subject: emailSubjects[payload.type],
  }
}

export async function sendEmail(
  payload: EmailSendPayload,
  logger: LogSink = console,
) {
  const fields = {
    type: payload.type,
    to: payload.to,
    idempotencyKey: payload.idempotencyKey,
  }

  if (!isEmailSendingEnabled(env.CONTEXT)) {
    logTo(logger, 'info', 'email.send.skipped', {
      ...fields,
      skipped: true,
      reason: 'preview',
    })
    return { providerMessageId: undefined, skipped: true }
  }

  const existing = await getDelivery(payload.idempotencyKey)
  if (isAlreadySent(existing) && existing?.providerMessageId) {
    logTo(logger, 'info', 'email.send.skipped', {
      ...fields,
      skipped: true,
      reason: 'already-sent',
      providerMessageId: existing.providerMessageId,
    })
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

  await markSent(payload.idempotencyKey, data.id)
  logTo(logger, 'info', 'email.send.sent', {
    ...fields,
    providerMessageId: data.id,
  })
  return { providerMessageId: data.id, skipped: false }
}
