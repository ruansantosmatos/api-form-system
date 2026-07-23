import { z } from 'zod'

const schema = {
  code: z.string().trim().min(6).max(10),
}

export const verifyCodeSchema = z.object(schema).required()

export type VerifyCodeDto = z.infer<typeof verifyCodeSchema>
