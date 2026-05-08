import { z } from 'zod'
import { createFormFieldOptionSchema } from './create-form-field-option.dto'

export const updateFormFieldOptionSchema = createFormFieldOptionSchema.partial().refine(data => Object.values(data).some(v => v !== undefined), {
  message: 'At least one field must be provided',
})

export type UpdateFormFieldOptionDto = z.infer<typeof updateFormFieldOptionSchema>
