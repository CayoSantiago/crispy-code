import { AskThread } from '@/features/ask/components/ask-thread'
import { AskThreadInput } from '@/features/ask/components/ask-thread-input'

export default async function AskThreadPage({
  params,
}: PageProps<'/ask/[threadId]'>) {
  const { threadId } = await params

  return (
    <>
      <AskThread threadId={threadId} />
      <AskThreadInput threadId={threadId} />
    </>
  )
}
