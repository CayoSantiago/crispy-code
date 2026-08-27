import { askRouter } from '@/features/ask/orpc'
import { findRouter } from '@/features/find/orpc'

export const appRouter = {
  ask: askRouter,
  find: findRouter,
}
export type AppRouter = typeof appRouter
