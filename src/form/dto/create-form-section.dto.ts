import { z } from 'zod'

export const createFormSectionSchema = z.object({
  title: z.string().min(1).max(150).trim().optional(),
  description: z.string().max(300).trim().optional(),
  order: z.number().int().nonnegative(),
})

export type CreateFormSectionDto = z.infer<typeof createFormSectionSchema>
