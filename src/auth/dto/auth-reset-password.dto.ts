import { z } from 'zod'

const schema = {
  token: z.string().trim().min(1),
  password: z.string().min(6).trim(),
}

export const authResetPasswordSchema = z.object(schema).required()

export type AuthResetPasswordDto = z.infer<typeof authResetPasswordSchema>
