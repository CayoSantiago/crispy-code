import { sendEmailFn } from '#inngest/functions'
import { pruneEmailDeliveriesFn } from '#inngest/prune'

export const emailFunctions = [sendEmailFn, pruneEmailDeliveriesFn]
