import 'server-only'

import { db } from '@repo/db'
import type { EmailSendPayload } from '#schema'

export async function upsertQueued(payload: EmailSendPayload): Promise<void> {
  await db.emailDelivery.upsert({
    where: { idempotencyKey: payload.idempotencyKey },
    create: {
      idempotencyKey: payload.idempotencyKey,
      type: payload.type,
      to: payload.to,
      status: 'QUEUED',
    },
    update: {},
  })
}

export async function getDelivery(idempotencyKey: string) {
  return db.emailDelivery.findUnique({ where: { idempotencyKey } })
}

export async function markSent(
  idempotencyKey: string,
  providerMessageId: string,
): Promise<void> {
  await db.emailDelivery.update({
    where: { idempotencyKey },
    data: { status: 'SENT', providerMessageId, lastError: null },
  })
}

export async function markFailed(
  idempotencyKey: string,
  lastError: string,
): Promise<void> {
  await db.emailDelivery.updateMany({
    where: { idempotencyKey, status: { not: 'SENT' } },
    data: { status: 'FAILED', lastError },
  })
}
