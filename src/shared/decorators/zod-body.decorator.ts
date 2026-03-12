import * as zod from 'zod'
import { Body } from '@nestjs/common'
import { ZodValidationPipe } from '../pipes/zod-validation.pipe'

export const ZodBody = (schema: zod.ZodSchema) => Body(new ZodValidationPipe(schema))