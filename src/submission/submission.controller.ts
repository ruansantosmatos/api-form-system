import { SubmissionService } from './submission.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { CurrentUser } from 'src/shared/decorators/current-user.decorator'
import { Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { createSubmissionSchema, type CreateSubmissionDto } from './dto/create-submission.dto'
import { type SubmissionCreateResult, type SubmissionDetailResult, type SubmissionListResult } from './interface/submission.interface'

@Controller('forms')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post(':form_id/submissions')
  async create(
    @Param('form_id', ParseIntPipe) form_id: number,
    @ZodBody(createSubmissionSchema) body: CreateSubmissionDto,
  ): Promise<SubmissionCreateResult> {
    return this.submissionService.create({ form_id, respondent_id: body.respondent_id ?? null, answers: body.answers })
  }

  @Get(':form_id/submissions')
  @UseGuards(JwtAuthGuard)
  async getAll(@Param('form_id', ParseIntPipe) form_id: number, @CurrentUser() user_id: number): Promise<SubmissionListResult> {
    return this.submissionService.getAll({ form_id, user_id })
  }

  @Get(':form_id/submissions/me')
  @UseGuards(JwtAuthGuard)
  async getMySubmission(@Param('form_id', ParseIntPipe) form_id: number, @CurrentUser() respondent_id: number): Promise<SubmissionDetailResult> {
    return this.submissionService.getMySubmission({ form_id, respondent_id })
  }

  @Get(':form_id/submissions/:submission_id')
  @UseGuards(JwtAuthGuard)
  async getOne(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('submission_id', ParseIntPipe) submission_id: number,
    @CurrentUser() user_id: number,
  ): Promise<SubmissionDetailResult> {
    return this.submissionService.getOne({ form_id, submission_id, user_id })
  }

  @Patch(':form_id/submissions/:submission_id')
  @UseGuards(JwtAuthGuard)
  async updateMySubmission(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('submission_id', ParseIntPipe) submission_id: number,
    @CurrentUser() respondent_id: number,
    @ZodBody(createSubmissionSchema) body: CreateSubmissionDto,
  ): Promise<SubmissionDetailResult | null> {
    return this.submissionService.updateOneSubmission({ form_id, submission_id, respondent_id, answers: body.answers })
  }
}
