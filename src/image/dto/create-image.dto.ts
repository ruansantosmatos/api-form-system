import { z } from 'zod'
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE_BYTES } from 'src/shared/consts/image'

export const createImageSchema = z.object({
  file_name: z.string().min(1).max(255).trim(),
  content_type: z.enum(ALLOWED_IMAGE_MIME_TYPES),
  size: z.number().int().positive().max(MAX_IMAGE_SIZE_BYTES),
})

export type CreateImageDto = z.infer<typeof createImageSchema>
