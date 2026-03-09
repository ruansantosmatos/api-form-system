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
      if (error instanceof zod.ZodError) throw new BadRequestException({ errors: this.formatIssues(error.issues) })
      throw new InternalServerErrorException()
    }
  }

  private formatIssues(issues: zod.core.$ZodIssue[]): Record<string, string> {
    return issues.reduce((acc, issue) => {
      const fieldName = issue.path.join('.')
      return { ...acc, [fieldName]: issue.message }
    }, {})
  }
}
