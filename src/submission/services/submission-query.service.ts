import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { detailInclude, toDetailResult } from '../mappers/submission-detail.mapper'
import type {
  SubmissionServiceGetAll,
  SubmissionServiceGetOne,
  SubmissionServiceGetMySubmission,
  SubmissionListResult,
  SubmissionDetailResult,
} from '../interface/submission.interface'

@Injectable()
export class SubmissionQueryService {
  constructor(private readonly prisma: PrismaClientService) {}

  async getAll({ form_id, user_id, page, limit, sort }: SubmissionServiceGetAll): Promise<SubmissionListResult> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })

    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException()

    const skip = (page - 1) * limit

    const [submissions, total] = await this.prisma.$transaction([
      this.prisma.formSubmission.findMany({
        where: { form_id },
        skip,
        take: limit,
        orderBy: { submitted_at: sort },
        select: {
          id: true,
          form_id: true,
          submitted_at: true,
          respondent: { select: { id: true, name: true, email: true } },
          _count: { select: { answers: true } },
        },
      }),
      this.prisma.formSubmission.count({ where: { form_id } }),
    ])

    return {
      data: submissions.map(({ _count, ...submission }) => ({ ...submission, answer_count: _count.answers })),
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    }
  }

  async getMySubmission({ form_id, respondent_id }: SubmissionServiceGetMySubmission): Promise<SubmissionDetailResult> {
    const submission = await this.prisma.formSubmission.findFirst({
      where: { form_id, respondent_id },
      include: detailInclude,
    })

    if (!submission) throw new NotFoundException('Submission not found')
    return toDetailResult(submission)
  }

  async getOne({ form_id, submission_id, user_id }: SubmissionServiceGetOne): Promise<SubmissionDetailResult> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })

    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException()

    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submission_id, form_id },
      include: detailInclude,
    })

    if (!submission) throw new NotFoundException('Submission not found')
    return toDetailResult(submission)
  }
}
