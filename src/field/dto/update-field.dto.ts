import { z } from 'zod'
import { createFieldSchema } from './create-field.dto'

export const updateFieldItemSchema = createFieldSchema
  .partial()
  .extend({ id: z.number().int().positive() })
  .refine(({ id: _id, ...rest }) => Object.keys(rest).length > 0, { message: 'At least one field must be provided' })

export const updateFieldsSchema = z.object({
  fields: z.array(updateFieldItemSchema).min(1),
})

export type UpdateFieldItemDto = z.infer<typeof updateFieldItemSchema>
export type UpdateFieldsDto = z.infer<typeof updateFieldsSchema>
