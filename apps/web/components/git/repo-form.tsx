'use client'

import { Button } from '@repo/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import { type FormEvent, useActionState } from 'react'
import { type ConnectRepoState, connectRepo } from '@/app/git/actions'
import { parseRepoInput } from '@/features/github/parse-repo-input'
import { rememberRecentRepo } from '@/features/github/recent-repos'

const initialState: ConnectRepoState = {}

export function RepoForm() {
  const [state, formAction, pending] = useActionState(connectRepo, initialState)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget)
    const repo = String(formData.get('repo') ?? '')
    const parsed = parseRepoInput(repo)

    if (parsed.ok) {
      rememberRecentRepo(parsed.owner, parsed.repo)
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className='grid gap-6'>
      <Field>
        <FieldLabel htmlFor='repo'>Repository</FieldLabel>
        <Input
          id='repo'
          name='repo'
          placeholder='vercel/next.js'
          autoComplete='off'
          autoCapitalize='none'
          spellCheck={false}
          required
        />
        <FieldDescription>
          A GitHub URL or owner/repo. Public repositories only.
        </FieldDescription>
        {state.error ? <FieldError>{state.error}</FieldError> : null}
      </Field>

      <Button type='submit' disabled={pending}>
        {pending ? 'Connecting...' : 'Connect'}
      </Button>
    </form>
  )
}
