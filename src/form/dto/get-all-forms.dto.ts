import { z } from 'zod'

const schema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['asc', 'desc']).default('asc'),
  favorite: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
}

export const getAllFormsSchema = z.object(schema)

export type GetAllFormsDto = z.infer<typeof getAllFormsSchema>
