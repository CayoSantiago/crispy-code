'use client'

import { Badge } from '@repo/ui/components/badge'
import { FolderGit2Icon, KeyIcon } from 'lucide-react'
import Link from 'next/link'
import { Tooltip } from '@/components/tooltip'
import { useAskConfigStatus } from '@/features/ask/hooks'

export function AskStatusNotifications() {
  const { geminiConfigured, hasLocalRootFolders } = useAskConfigStatus()

  return (
    <>
      {!geminiConfigured ? (
        <Tooltip
          tooltip={
            <p>
              Set{' '}
              <code className='px-1 py-px -my-px rounded-xs bg-muted'>
                GEMINI_API_KEY
              </code>{' '}
              in{' '}
              <code className='px-1 py-px -my-px rounded-xs bg-muted'>
                apps/web/.env.local
              </code>{' '}
              to enable Ask.
            </p>
          }
          render={<Badge variant='card' className='gap-1.5' />}
        >
          <KeyIcon data-icon='inline-start' className='text-destructive' />
          <span>Missing Token</span>
        </Tooltip>
      ) : null}

      {!hasLocalRootFolders ? (
        <Tooltip
          tooltip={
            <p>
              Ask only searches local folders. Add a folder on{' '}
              <Link href='/find' className='underline underline-offset-2'>
                Code Finder
              </Link>{' '}
              to use as context for the ai.
            </p>
          }
          render={<Badge variant='card' className='gap-1.5' />}
        >
          <FolderGit2Icon
            data-icon='inline-start'
            className='text-destructive'
          />
          <span>Missing Sources</span>
        </Tooltip>
      ) : null}
    </>
  )
}
