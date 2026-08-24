import { AskInput } from '@/features/ask/components/ask-input'
import { AskShell } from '@/features/ask/components/ask-shell'
import { AskEmpty } from '@/features/ask/components/ask-thread'

export default function AskPage() {
  return (
    <AskShell composer={<AskInput />}>
      <AskEmpty />
    </AskShell>
  )
}
