import { z } from 'zod'

const schema = {
  challenge_token: z.string().trim(),
  code: z.string().trim().min(6).max(10),
}

export const authVerifyTwoFactorSchema = z.object(schema).required()

export type AuthVerifyTwoFactorDto = z.infer<typeof authVerifyTwoFactorSchema>
