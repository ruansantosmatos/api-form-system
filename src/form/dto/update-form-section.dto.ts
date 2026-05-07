import { z } from 'zod'

export const updateFormSectionItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(150).trim().optional(),
  description: z.string().max(150).trim().optional(),
  order: z.number().int().nonnegative().optional(),
})

export const updateFormSectionsSchema = z.object({
  sections: z.array(updateFormSectionItemSchema).min(1),
})

export type UpdateFormSectionItemDto = z.infer<typeof updateFormSectionItemSchema>
export type UpdateFormSectionsDto = z.infer<typeof updateFormSectionsSchema>
