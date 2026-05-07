import { z } from 'zod'

export const createFormSectionFieldSchema = z.object({
  category_id: z.number().int().positive(),
  type_id: z.number().int().positive(),
  label: z.string().min(1).max(150).trim(),
  required: z.boolean().default(false),
  order: z.number().int().nonnegative(),
})

export type CreateFormSectionFieldDto = z.infer<typeof createFormSectionFieldSchema>
