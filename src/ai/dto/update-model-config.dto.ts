import { z } from 'zod'

export const updateModelConfigSchema = z
  .object({
    max_output_tokens: z.number().int().positive(),
    temperature: z.number().min(0).max(2).nullable(),
    top_p: z.number().min(0).max(1).nullable(),
    frequency_penalty: z.number().min(-2).max(2).nullable(),
    presence_penalty: z.number().min(-2).max(2).nullable(),
    system_prompt: z.string().trim().max(20000).nullable(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (!Object.values(data).some(v => v !== undefined)) {
      ctx.addIssue({ code: 'custom', message: 'At least one field must be provided' })
    }
  })

export type UpdateModelConfigDto = z.infer<typeof updateModelConfigSchema>
