import { z } from 'zod'

export const upsertCredentialSchema = z.object({
  api_key: z.string().trim().min(20).max(250),
  label: z.string().trim().min(1).max(80).optional(),
})

export type UpsertCredentialDto = z.infer<typeof upsertCredentialSchema>
