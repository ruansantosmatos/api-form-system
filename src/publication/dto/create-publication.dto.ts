import { z } from 'zod'

const configSchema = z.object({
  expires_at: z.iso
    .datetime()
    .transform(v => new Date(v))
    .optional(),
  max_responses: z.number().int().positive().optional(),
  allow_anonymous: z.boolean().default(false),
})

export const createPublicationSchema = z.object({
  config: configSchema.optional(),
})

export type CreatePublicationDto = z.infer<typeof createPublicationSchema>
