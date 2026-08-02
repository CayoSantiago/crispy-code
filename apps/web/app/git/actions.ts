'use server'

import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { parseRepoInput } from '@/lib/github/parse-repo-input'

export type ConnectRepoState = { error?: string }

const connectRepoFields = z.object({
  repo: z.string(),
})

export async function connectRepo(
  _state: ConnectRepoState,
  formData: FormData,
): Promise<ConnectRepoState> {
  const fields = connectRepoFields.safeParse({
    repo: formData.get('repo'),
  })

  if (!fields.success) {
    return { error: 'Enter a repository.' }
  }

  const parsed = parseRepoInput(fields.data.repo)

  if (!parsed.ok) {
    return { error: parsed.error }
  }

  redirect(`/git/${parsed.owner}/${parsed.repo}` as Route)
}
