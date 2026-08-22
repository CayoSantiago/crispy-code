'use client'

import { Input } from '@repo/ui/components/input'
import { useFieldContext } from '#context'

export function TextField(props: React.ComponentProps<typeof Input>) {
  const field = useFieldContext<string>()

  return (
    <Input
      type='text'
      id={field.name}
      name={field.name}
      value={field.state.value ?? ''}
      onBlur={field.handleBlur}
      onChange={(e) => field.handleChange(e.target.value)}
      aria-invalid={!field.state.meta.isValid}
      autoComplete='off'
      {...props}
    />
  )
}
