'use client'

import {
  FieldError,
  FieldLabel,
  Field as FieldPrimitive,
} from '@repo/ui/components/field'
import { useFieldContext } from '#context'

function Field(props: React.ComponentProps<typeof FieldPrimitive>) {
  const field = useFieldContext<string>()

  return <FieldPrimitive data-invalid={!field.state.meta.isValid} {...props} />
}

function Label(props: React.ComponentProps<typeof FieldLabel>) {
  const field = useFieldContext<string>()

  return <FieldLabel htmlFor={field.name} {...props} />
}

function Errors(props: React.ComponentProps<typeof FieldError>) {
  const field = useFieldContext<string>()

  if (field.state.meta.isValid) return null

  return <FieldError errors={field.state.meta.errors} {...props} />
}

export { Errors, Field, Label }
