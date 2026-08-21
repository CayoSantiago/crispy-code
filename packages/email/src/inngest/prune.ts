import 'server-only'

import { db } from '@repo/db'
import { inngest } from '#inngest/client'
import { logEmail } from '#log'

const DAY = 24 * 60 * 60 * 1000

export const pruneEmailDeliveriesFn = inngest.createFunction(
  {
    id: 'email-delivery-prune',
    triggers: [{ cron: '0 4 * * *' }],
  },
  async ({ step, logger }) => {
    const result = await step.run('delete-old-rows', async () => {
      const sent = await db.emailDelivery.deleteMany({
        where: {
          status: 'SENT',
          createdAt: { lt: new Date(Date.now() - 30 * DAY) },
        },
      })
      const queued = await db.emailDelivery.deleteMany({
        where: {
          status: 'QUEUED',
          createdAt: { lt: new Date(Date.now() - 7 * DAY) },
        },
      })
      const failed = await db.emailDelivery.deleteMany({
        where: {
          status: 'FAILED',
          createdAt: { lt: new Date(Date.now() - 90 * DAY) },
        },
      })
      return {
        sent: sent.count,
        queued: queued.count,
        failed: failed.count,
      }
    })
    logEmail(logger, 'info', 'email.prune.completed', result)
    return result
  },
)
