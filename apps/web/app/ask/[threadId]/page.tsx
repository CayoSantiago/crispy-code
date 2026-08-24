import { AskThread } from '@/features/ask/components/ask-thread'

export default async function AskThreadPage({
  params,
}: PageProps<'/ask/[threadId]'>) {
  const { threadId } = await params

  return <AskThread threadId={threadId} />
}
