import { SubmissionService } from './submission.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { CurrentUser } from 'src/shared/decorators/current-user.decorator'
import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { createSubmissionSchema, type CreateSubmissionDto } from './dto/create-submission.dto'

@Controller('forms')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post(':form_id/submissions')
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('form_id', ParseIntPipe) form_id: number,
    @CurrentUser() respondent_id: number,
    @ZodBody(createSubmissionSchema) body: CreateSubmissionDto,
  ) {
    return this.submissionService.create({ form_id, respondent_id, answers: body.answers })
  }

  @Get(':form_id/submissions')
  @UseGuards(JwtAuthGuard)
  async getAll(@Param('form_id', ParseIntPipe) form_id: number, @CurrentUser() user_id: number) {
    return this.submissionService.getAll({ form_id, user_id })
  }

  @Get(':form_id/submissions/:submission_id')
  @UseGuards(JwtAuthGuard)
  async getOne(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('submission_id', ParseIntPipe) submission_id: number,
    @CurrentUser() user_id: number,
  ) {
    return this.submissionService.getOne({ form_id, submission_id, user_id })
  }
}
