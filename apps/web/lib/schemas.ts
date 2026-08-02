import z from 'zod'

export function resilientArray<T extends z.ZodType>(item: T) {
  return z
    .array(z.unknown())
    .transform((items) =>
      items.flatMap((value) => {
        const result = item.safeParse(value)
        return result.success ? [result.data] : []
      }),
    )
    .catch([])
}
