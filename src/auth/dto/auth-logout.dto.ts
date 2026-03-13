import { z } from 'zod'

const schema = { session_id: z.number().int().positive() }

export const authLogoutSchema = z.object(schema).required()

export type AuthLogoutDto = z.infer<typeof authLogoutSchema>
