import type {
  FormApi,
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  StandardSchemaV1Issue,
} from '@tanstack/react-form'

export function focusInvalidInput<
  T,
  TOnMount extends FormValidateOrFn<T> | undefined,
  TOnChange extends FormValidateOrFn<T> | undefined,
  TOnChangeAsync extends FormAsyncValidateOrFn<T> | undefined,
  TOnBlur extends FormValidateOrFn<T> | undefined,
  TOnBlurAsync extends FormAsyncValidateOrFn<T> | undefined,
  TOnSubmit extends FormValidateOrFn<T> | undefined,
  TOnSubmitAsync extends FormAsyncValidateOrFn<T> | undefined,
  TOnDynamic extends FormValidateOrFn<T> | undefined,
  TOnDynamicAsync extends FormAsyncValidateOrFn<T> | undefined,
  TOnServer extends FormAsyncValidateOrFn<T> | undefined,
  TSubmitMeta = unknown,
>(
  formId: string,
): (props: {
  value: T
  formApi: FormApi<
    T,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta
  >
  meta: TSubmitMeta
}) => void {
  return ({ formApi }) => {
    const errorMap = formApi.state.errorMap.onDynamic as Record<
      string,
      StandardSchemaV1Issue[]
    >

    const inputs = Array.from(
      document.querySelectorAll(`#${formId} input`),
    ) as HTMLInputElement[]

    let firstInput: HTMLInputElement | undefined
    for (const input of inputs) {
      if (errorMap?.[input.name]) {
        firstInput = input
        break
      }
    }

    firstInput?.focus()
  }
}

export function onSubmitErrorTypingValidator() {
  return { form: undefined as string | undefined, fields: {} }
}
