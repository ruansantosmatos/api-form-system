import { z } from 'zod'

export const updateFormSchema = z
  .object({
    title: z.string().min(1).max(50).trim(),
    description: z.string().max(200).trim(),
    published: z.boolean(),
  })
  .partial()
  .refine(data => Object.values(data).some(v => v !== undefined), {
    message: 'At least one field must be provided',
  })

export type UpdateFormDto = z.infer<typeof updateFormSchema>
