import { z } from 'zod'

const schema = {
  email: z.email(),
  name: z.string().min(5),
  password: z.string().min(6),
}

export const createRegisterSchema = z.object(schema).required()

export type CreateRegisterDto = z.infer<typeof createRegisterSchema>
