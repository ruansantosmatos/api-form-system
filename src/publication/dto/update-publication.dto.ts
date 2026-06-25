import { z } from 'zod'

export const updatePublicationSchema = z.object({
  is_active: z.boolean().optional(),
})

export type UpdatePublicationDto = z.infer<typeof updatePublicationSchema>
