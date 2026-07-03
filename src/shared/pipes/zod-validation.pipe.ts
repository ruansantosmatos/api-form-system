import * as zod from 'zod'
import { Injectable, PipeTransform, ArgumentMetadata, BadRequestException, InternalServerErrorException } from '@nestjs/common'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: zod.ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      const validatedData = this.schema.parse(value)
      return validatedData
    } catch (error) {
      if (error instanceof zod.ZodError) {
        const formatted = this.formatIssues(error.issues)
        console.log('[ZodValidationPipe] validation errors:', JSON.stringify(formatted, null, 2))
        throw new BadRequestException({ errors: formatted })
      }
      throw new InternalServerErrorException()
    }
  }

  private formatIssues(issues: zod.core.$ZodIssue[]): Record<string, string> {
    const errors: Record<string, string> = {}

    for (const issue of issues) {
      const fieldName = issue.path.join('.')
      errors[fieldName] = issue.message
    }

    return errors
  }
}
