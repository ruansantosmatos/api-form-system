import { z } from 'zod'

const schema = {
  email: z.email().trim(),
}

export const authForgotPasswordSchema = z.object(schema).required()

export type AuthForgotPasswordDto = z.infer<typeof authForgotPasswordSchema>
