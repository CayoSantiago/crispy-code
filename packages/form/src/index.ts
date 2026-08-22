import { createFormHook } from '@tanstack/react-form'
import { Errors, Field, Label } from '#components/field'
import { TextBox } from '#components/text-box'
import { TextField } from '#components/text-field'
import { fieldContext, formContext } from '#context'

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    Field,
    Label,
    Errors,
    TextField,
    TextBox,
  },
  formComponents: {},
})
