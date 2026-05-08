import { z } from 'zod'

export const createFormFieldOptionSchema = z.object({
  label: z.string().min(1).max(150).trim(),
  value: z.string().min(1).max(150).trim(),
})

export type CreateFormFieldOptionDto = z.infer<typeof createFormFieldOptionSchema>
