import { z } from 'zod'

export const generateFormSchema = z.object({
  prompt: z.string().trim().min(10).max(4000),
})

export type GenerateFormDto = z.infer<typeof generateFormSchema>
