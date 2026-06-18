import { z } from 'zod'

export const createFieldSchema = z.object({
  category_id: z.number().int().positive(),
  type_id: z.number().int().positive(),
  label: z.string().min(1).max(150).trim(),
  required: z.boolean(),
  order: z.number().int().nonnegative(),
})

export type CreateFieldDto = z.infer<typeof createFieldSchema>
