import { z } from 'zod'
import { TokenPayload } from 'google-auth-library'

const schema = {
  email: z.email().trim(),
  name: z.string().min(5).trim(),
  password: z.string().min(6).trim(),
}

export const createRegisterSchema = z.object(schema).required()

export type CreateRegisterDto = z.infer<typeof createRegisterSchema>

export type CreateRegisterGoogleDto = {
  credential: TokenPayload
}
