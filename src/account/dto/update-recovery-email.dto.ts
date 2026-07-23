import { z } from 'zod'

const schema = {
  recovery_email: z.email().trim(),
}

export const updateRecoveryEmailSchema = z.object(schema).required()

export type UpdateRecoveryEmailDto = z.infer<typeof updateRecoveryEmailSchema>
