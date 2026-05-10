import { z } from 'zod'

export const createFieldOptionSchema = z.object({
  label: z.string().min(1).max(150).trim(),
  value: z.string().min(1).max(150).trim(),
})

export type CreateFieldOptionDto = z.infer<typeof createFieldOptionSchema>
