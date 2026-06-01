import * as zod from 'zod'
import { Query } from '@nestjs/common'
import { ZodValidationPipe } from '../pipes/zod-validation.pipe'

export const ZodQuery = (schema: zod.ZodSchema) => Query(new ZodValidationPipe(schema))
