import { z } from 'zod'

export const getAllSubmissionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['asc', 'desc']).default('desc'),
})

export type GetAllSubmissionsDto = z.infer<typeof getAllSubmissionsSchema>
