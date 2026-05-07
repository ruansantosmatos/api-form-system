import { z } from 'zod'
import { createFormSectionFieldSchema } from './create-form-section-field.dto'

export const updateFormSectionFieldItemSchema = createFormSectionFieldSchema
  .partial()
  .extend({ id: z.number().int().positive() })
  .refine(({ id: _id, ...rest }) => Object.keys(rest).length > 0, { message: 'At least one field must be provided' })

export const updateFormSectionFieldsSchema = z.object({
  fields: z.array(updateFormSectionFieldItemSchema).min(1),
})

export type UpdateFormSectionFieldItemDto = z.infer<typeof updateFormSectionFieldItemSchema>
export type UpdateFormSectionFieldsDto = z.infer<typeof updateFormSectionFieldsSchema>
