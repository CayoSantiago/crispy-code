export type Option<TData, TError = unknown> =
  | { success: true; data: TData }
  | { success: false; error: TError }

export async function tryCatch<T>(promise: Promise<T>): Promise<Option<T>> {
  try {
    return { success: true, data: await promise }
  } catch (error) {
    return { success: false, error }
  }
}
