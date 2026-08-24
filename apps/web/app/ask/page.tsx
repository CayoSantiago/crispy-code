import { AskInput } from '@/features/ask/components/ask-input'
import { AskShell } from '@/features/ask/components/ask-shell'
import { AskEmpty } from '@/features/ask/components/ask-thread'
import '@/lib/orpc/client.server'

export default function AskPage() {
  return (
    <AskShell composer={<AskInput />}>
      <AskEmpty />
    </AskShell>
  )
}
