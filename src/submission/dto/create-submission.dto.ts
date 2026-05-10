import { z } from 'zod'

export const createSubmissionSchema = z.object({
  answers: z
    .array(
      z.object({
        field_id: z.number().int().positive(),
        value: z.string().optional(),
        option_ids: z.array(z.number().int().positive()).min(1).optional(),
      }),
    )
    .min(1),
})

export type CreateSubmissionDto = z.infer<typeof createSubmissionSchema>
