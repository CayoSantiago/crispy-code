'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { parseRepoInput } from '@/lib/github/parse-repo-input'

export type ConnectRepoState = { error?: string }

export async function connectRepo(
  _state: ConnectRepoState,
  formData: FormData,
): Promise<ConnectRepoState> {
  const parsed = parseRepoInput(String(formData.get('repo') ?? ''))

  if (!parsed.ok) {
    return { error: parsed.error }
  }

  redirect(`/git/${parsed.owner}/${parsed.repo}` as Route)
}
