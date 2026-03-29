import { z } from 'zod'

const schema = {
  email: z.email().trim(),
  password: z.string().min(6).trim(),
}

export const authLoginSchema = z.object(schema).required()

export type AuthLoginDto = z.infer<typeof authLoginSchema>
