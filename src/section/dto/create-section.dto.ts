import { z } from 'zod'

export const createSectionSchema = z.object({
  title: z.string().min(1).max(150).trim().optional(),
  description: z.string().max(150).trim().optional(),
  order: z.number().int().nonnegative(),
})

export type CreateSectionDto = z.infer<typeof createSectionSchema>
