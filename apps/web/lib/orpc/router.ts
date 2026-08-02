import { findRouter } from '@/features/find/orpc'

export const appRouter = {
  find: findRouter,
}

export type AppRouter = typeof appRouter
