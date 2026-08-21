import type { Session } from '@repo/auth/server'

export type OrpcContext = {
  headers: Headers
  session: Session['session'] | null
  user: Session['user'] | null
}
