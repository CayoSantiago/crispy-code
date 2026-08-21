import z from 'zod/v4'

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

export const successResponseSchema = z.object({
  success: z.string(),
})

export type SuccessResponse = z.infer<typeof successResponseSchema>
