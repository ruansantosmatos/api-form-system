import { z } from 'zod'

export const updateFormConfigSchema = z
  .object({
    starts_at: z.coerce.date().nullable(),
    expires_at: z.coerce.date().nullable(),
    max_responses: z.number().int().positive().nullable(),
    allow_anonymous: z.boolean(),
    single_response_per_user: z.boolean(),
    allow_edit_response: z.boolean(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (!Object.values(data).some(v => v !== undefined)) {
      ctx.addIssue({ code: 'custom', message: 'At least one field must be provided' })
      return
    }

    const now = new Date()

    if (data.starts_at != null && data.starts_at <= now) {
      ctx.addIssue({ code: 'custom', message: 'starts_at must be a future date', path: ['starts_at'] })
    }

    if (data.expires_at != null && data.expires_at <= now) {
      ctx.addIssue({ code: 'custom', message: 'expires_at must be a future date', path: ['expires_at'] })
    }

    if (data.starts_at != null && data.expires_at != null && data.expires_at <= data.starts_at) {
      ctx.addIssue({ code: 'custom', message: 'expires_at must be after starts_at', path: ['expires_at'] })
    }
  })

export type UpdateFormConfigDto = z.infer<typeof updateFormConfigSchema>
