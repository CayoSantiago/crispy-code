'use client'

import { isDefinedError } from '@orpc/client'
import { Button } from '@repo/ui/components/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@repo/ui/components/empty'
import { Field, FieldError, FieldLabel } from '@repo/ui/components/field'
import { Input } from '@repo/ui/components/input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
import type { FindConfig } from '@/features/find/config/schemas'
import { orpc } from '@/lib/orpc/client'

const emptyConfig: FindConfig = { localRoots: [], githubRepos: [] }

export function SourcesPanel() {
  const queryClient = useQueryClient()
  const configQuery = useQuery(orpc.find.getConfig.queryOptions())
  const addLocalRootMutation = useMutation(
    orpc.find.addLocalRoot.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.find.getConfig.key(),
        })
      },
    }),
  )
  const removeLocalRootMutation = useMutation(
    orpc.find.removeLocalRoot.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.find.getConfig.key(),
        })
        await queryClient.invalidateQueries({
          queryKey: orpc.find.search.key(),
        })
      },
    }),
  )
  const config = configQuery.data ?? emptyConfig
  const addLocalRootError = addLocalRootMutation.isError
    ? isDefinedError(addLocalRootMutation.error)
      ? addLocalRootMutation.error.message
      : addLocalRootMutation.error instanceof Error
        ? addLocalRootMutation.error.message
        : 'Enter a local project folder.'
    : null

  return (
    <div className='grid gap-6'>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const form = event.currentTarget
          const data = new FormData(form)
          addLocalRootMutation.mutate(
            { localPath: String(data.get('localPath') ?? '') },
            { onSuccess: () => form.reset() },
          )
        }}
        className='grid gap-3'
      >
        <Field>
          <FieldLabel htmlFor='localPath'>Add local folder</FieldLabel>
          <Input
            id='localPath'
            name='localPath'
            placeholder='~/Projects'
            required
            autoComplete='off'
          />
          {addLocalRootError ? (
            <FieldError>{addLocalRootError}</FieldError>
          ) : null}
        </Field>
        <Button type='submit' disabled={addLocalRootMutation.isPending}>
          {addLocalRootMutation.isPending ? 'Adding...' : 'Add local source'}
        </Button>
      </form>

      {config.localRoots.length ? (
        <div className='grid gap-2'>
          {config.localRoots.map((root) => (
            <div
              key={root.id}
              className='flex items-center justify-between rounded-md border bg-card px-3 py-2'
            >
              <p className='font-mono text-xs break-all'>{root.path}</p>
              <Button
                variant='ghost'
                size='icon-sm'
                disabled={removeLocalRootMutation.isPending}
                onClick={() => removeLocalRootMutation.mutate({ id: root.id })}
              >
                <Trash2Icon />
                <span className='sr-only'>Remove local source</span>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No local folders yet</EmptyTitle>
            <EmptyDescription>
              Add a project folder on this machine to include it in search.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
