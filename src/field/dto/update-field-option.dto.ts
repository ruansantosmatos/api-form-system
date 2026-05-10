import { z } from 'zod'
import { createFieldOptionSchema } from './create-field-option.dto'

export const updateFieldOptionSchema = createFieldOptionSchema.partial().refine(data => Object.values(data).some(v => v !== undefined), {
  message: 'At least one field must be provided',
})

export type UpdateFieldOptionDto = z.infer<typeof updateFieldOptionSchema>
