import { z } from 'zod'

export const updateSectionItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(150).trim().optional(),
  description: z.string().max(150).trim().optional(),
  order: z.number().int().nonnegative().optional(),
})

export const updateSectionsSchema = z.object({
  sections: z.array(updateSectionItemSchema).min(1),
})

export type UpdateSectionItemDto = z.infer<typeof updateSectionItemSchema>
export type UpdateSectionsDto = z.infer<typeof updateSectionsSchema>
