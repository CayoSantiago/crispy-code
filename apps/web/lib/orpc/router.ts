import { askRouter } from '@/features/ask/orpc'
import { findRouter } from '@/features/find/orpc'

export const appRouter = {
  find: findRouter,
  ask: askRouter,
}

export type AppRouter = typeof appRouter
