import { z } from 'zod'

export const createFormSchema = z.object({
  user_id: z.number().int().positive(),
  title: z.string().min(1).max(50).trim(),
  description: z.string().max(200).trim(),
})

export type CreateFormDto = z.infer<typeof createFormSchema>
