import { z } from 'zod'

const schema = {
  session_id: z.number().int().positive(),
  refresh_token: z.string().trim(),
}

export const authRefreshSchema = z.object(schema).required()

export type AuthRefreshDto = z.infer<typeof authRefreshSchema>
