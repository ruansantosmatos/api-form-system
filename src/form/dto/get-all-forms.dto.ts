import { z } from 'zod'

const schema = {
  search: z.string().trim().min(1).optional(),
  sort: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['all', 'published', 'unpublished', 'favorite']).default('all'),
}

export const getAllFormsSchema = z.object(schema)

export type GetAllFormsDto = z.infer<typeof getAllFormsSchema>
