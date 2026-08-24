import { AskShell } from '@/features/ask/components/ask-shell'
import { AskThread } from '@/features/ask/components/ask-thread'
import { AskThreadInput } from '@/features/ask/components/ask-thread-input'

export default async function AskThreadPage({
  params,
}: PageProps<'/ask/[threadId]'>) {
  const { threadId } = await params

  return (
    <AskShell composer={<AskThreadInput threadId={threadId} />}>
      <AskThread threadId={threadId} />
    </AskShell>
  )
}
