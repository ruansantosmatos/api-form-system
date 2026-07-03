import { z } from 'zod'

export const updateFieldOptionSchema = z
  .object({
    label: z.string().max(150).trim(),
    value: z.string().max(150).trim(),
  })
  .partial()
  .refine(data => Object.values(data).some(v => v !== undefined), { message: 'At least one field must be provided' })

export type UpdateFieldOptionDto = z.infer<typeof updateFieldOptionSchema>
