import {
  createServerValidate,
  type FormAsyncValidateOrFn,
  type FormOptions,
  type FormValidateOrFn,
  type ServerFormState,
  ServerValidateError,
} from '@tanstack/react-form-nextjs'
import { tryCatch } from '@/lib/helpers'

const DEFAULT_ERROR_MESSAGE = 'An unexpected server error occured'
const DEFAULT_SUCCESS_MESSAGE = 'Success'

// biome-ignore lint/suspicious/noExplicitAny: fine here
export type ServerActionResponse = ServerFormState<any, any> & {
  success?: string
}

export function createSuccessResponse<T>({
  values,
  message,
}: {
  values: T
  message: string
}): ServerActionResponse {
  return {
    values,
    errorMap: { onServer: undefined },
    errors: [],
    success: message,
  }
}

export function createErrorResponse<T>({
  values,
  message,
}: {
  values: T
  message: string
}): ServerActionResponse {
  return { values, errorMap: { onServer: message }, errors: [message] }
}

export function createServerAction<
  TFormData,
  TOnMount extends undefined | FormValidateOrFn<TFormData>,
  TOnChange extends undefined | FormValidateOrFn<TFormData>,
  TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnBlur extends undefined | FormValidateOrFn<TFormData>,
  TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta,
  THandlerResponse,
>({
  handler,
  onSuccess,
  onError,
  successMessage,
  errorMessage: _errorMessage,
  resetFields,
  ...options
}: FormOptions<
  TFormData,
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
> & {
  onServerValidate: TOnServer
  handler: (values: TFormData) => Promise<THandlerResponse>
  onSuccess?: (data: {
    data: THandlerResponse
    values: TFormData
  }) => ServerActionResponse | Promise<ServerActionResponse>
  onError?: (data: {
    error: unknown
    values: TFormData
  }) => ServerActionResponse | Promise<ServerActionResponse>
  resetFields?: Partial<TFormData>
  successMessage?: string
  errorMessage?: string | ((error: unknown) => string)
}): (_prev: unknown, formData: FormData) => Promise<ServerActionResponse> {
  const serverValidate = createServerValidate(options)

  return async (_prev: unknown, formData: FormData) => {
    const parsed = await tryCatch(serverValidate(formData))

    // Validation error
    if (!parsed.success) {
      if (parsed.error instanceof ServerValidateError)
        return parsed.error.formState
      throw parsed.error
    }

    const values = { ...parsed.data, ...(resetFields ?? {}) }
    const res = await tryCatch(handler(values))

    // onError
    if (!res.success) {
      if (onError)
        return await onError({ values: parsed.data, error: res.error })

      const errorMessage =
        typeof _errorMessage === 'string'
          ? _errorMessage
          : _errorMessage
            ? _errorMessage(res.error)
            : DEFAULT_ERROR_MESSAGE

      return createErrorResponse({ values, message: errorMessage })
    }

    // onSuccess
    if (onSuccess)
      return await onSuccess({ values: parsed.data, data: res.data })

    return createSuccessResponse({
      values,
      message: successMessage ?? DEFAULT_SUCCESS_MESSAGE,
    })
  }
}
