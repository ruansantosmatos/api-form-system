import { Prisma } from 'src/generated/prisma/client'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import type {
  SubmissionServiceCreate,
  SubmissionServiceGetAll,
  SubmissionServiceGetOne,
  SubmissionServiceGetMySubmission,
  SubmissionServiceUpdateMySubmission,
  SubmissionListResult,
  SubmissionDetailResult,
} from './interface/submission.interface'

const detailInclude = {
  answers: {
    include: {
      field: { select: { id: true, label: true } },
      options: { select: { option_id: true, option: { select: { label: true, value: true } } } },
    },
  },
} satisfies Prisma.FormSubmissionInclude

type SubmissionWithAnswers = {
  id: number
  form_id: number
  respondent_id: number | null
  submitted_at: Date
  answers: {
    id: number
    field_id: number
    value: string | null
    field: { id: number; label: string }
    options: { option_id: number; option: { label: string; value: string } }[]
  }[]
}

function toDetailResult(submission: SubmissionWithAnswers): SubmissionDetailResult {
  return {
    id: submission.id,
    form_id: submission.form_id,
    respondent_id: submission.respondent_id,
    submitted_at: submission.submitted_at,
    answers: submission.answers.map(answer => ({
      id: answer.id,
      field_id: answer.field_id,
      field_label: answer.field.label,
      value: answer.value,
      options: answer.options.map(o => ({ option_id: o.option_id, label: o.option.label, value: o.option.value })),
    })),
  }
}

@Injectable()
export class SubmissionService {
  constructor(private readonly prisma: PrismaClientService) {}

  async create({ form_id, respondent_id, answers }: SubmissionServiceCreate) {
    await this.validateForm(form_id)
    await this.validateFormConfig(form_id, respondent_id)

    await this.validateAnswers(form_id, answers)
    return this.persist(form_id, respondent_id, answers)
  }

  private async validateForm(form_id: number) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')
    if (!form.published) throw new UnprocessableEntityException('Form is not published')
  }

  private async validateFormConfig(form_id: number, respondent_id: number | null) {
    const now = new Date()
    const config = await this.prisma.formConfig.findUnique({ where: { form_id } })

    if (!config) return

    if (!config.allow_anonymous && respondent_id === null) throw new ForbiddenException('This form does not allow anonymous submissions')

    if (config.starts_at && now < config.starts_at) throw new UnprocessableEntityException('This form is not yet open for submissions')

    if (config.expires_at && now > config.expires_at) throw new UnprocessableEntityException('This form is no longer accepting submissions')

    if (config.max_responses !== null) {
      const count = await this.prisma.formSubmission.count({ where: { form_id } })
      if (count >= config.max_responses) throw new UnprocessableEntityException('This form has reached the maximum number of responses')
    }

    if (config.single_response_per_user && respondent_id !== null) {
      const existing = await this.prisma.formSubmission.findFirst({ where: { form_id, respondent_id } })
      if (existing) throw new UnprocessableEntityException('You have already submitted this form')
    }
  }

  private async validateAnswers(form_id: number, answers: SubmissionServiceCreate['answers']) {
    await this.validateFieldsBelongToForm(form_id, answers)
    await this.validateOptionsBelongToFields(answers)
  }

  private async validateFieldsBelongToForm(form_id: number, answers: SubmissionServiceCreate['answers']) {
    const formFields = await this.prisma.formField.findMany({
      where: { OR: [{ form_id }, { section: { form_id } }] },
      select: { id: true },
    })

    const validFieldIds = new Set(formFields.map(f => f.id))
    const invalidField = answers.find(a => !validFieldIds.has(a.field_id))
    if (invalidField) throw new UnprocessableEntityException(`Field ${invalidField.field_id} does not belong to this form`)

    const fieldIds = answers.map(answers => answers.field_id)
    const duplicateFieldId = fieldIds.find((id, index) => fieldIds.indexOf(id) !== index)
    if (duplicateFieldId) throw new UnprocessableEntityException(`Duplicate answer for field ${duplicateFieldId}`)
  }

  private async validateOptionsBelongToFields(answers: SubmissionServiceCreate['answers']) {
    const optionAnswers = answers.filter(answers => answers.option_ids?.length)
    if (!optionAnswers.length) return

    const allOptionIds = optionAnswers.flatMap(optionAnswers => optionAnswers.option_ids!)

    const validOptions = await this.prisma.formFieldOption.findMany({
      where: { id: { in: allOptionIds } },
      select: { id: true, field_id: true },
    })

    const validOptionsMap = new Map(validOptions.map(opt => [opt.id, opt.field_id]))

    for (const answer of optionAnswers) {
      const invalid = answer.option_ids!.find(option_id => validOptionsMap.get(option_id) !== answer.field_id)
      if (invalid) throw new UnprocessableEntityException(`Option ${invalid} does not belong to field ${answer.field_id}`)
    }
  }

  private async persist(form_id: number, respondent_id: number | null, answers: SubmissionServiceCreate['answers']) {
    return this.prisma.$transaction(async tx => {
      const submission = await tx.formSubmission.create({ data: { form_id, respondent_id } })

      for (const answer of answers) {
        const formAnswer = await tx.formSubmissionAnswer.create({
          data: {
            value: answer.value,
            field_id: answer.field_id,
            submission_id: submission.id,
          },
        })

        if (answer.option_ids?.length) {
          await tx.formSubmissionAnswerOption.createMany({
            data: answer.option_ids.map(option_id => ({ answer_id: formAnswer.id, option_id })),
          })
        }
      }

      return tx.formSubmission.findUnique({
        where: { id: submission.id },
        include: { answers: { include: { options: { select: { option_id: true } } } } },
      })
    })
  }

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

  async updateOneSubmission({
    form_id,
    submission_id,
    respondent_id,
    answers,
  }: SubmissionServiceUpdateMySubmission): Promise<SubmissionDetailResult | null> {
    const config = await this.prisma.formConfig.findUnique({ where: { form_id } })
    if (!config?.allow_edit_response) throw new ForbiddenException('This form does not allow editing responses')

    const submission = await this.prisma.formSubmission.findUnique({ where: { id: submission_id, form_id } })
    if (!submission) throw new NotFoundException('Submission not found')

    if (submission.respondent_id !== respondent_id) throw new ForbiddenException()
    await this.validateAnswers(form_id, answers)

    const updated = await this.prisma.$transaction(async tx => {
      for (const answer of answers) {
        await this.persistAnswerUpdate(tx, submission.id, answer)
      }

      return tx.formSubmission.findUnique({ where: { id: submission.id }, include: detailInclude })
    })

    return updated ? toDetailResult(updated) : null
  }

  private async persistAnswerUpdate(tx: Prisma.TransactionClient, submission_id: number, answer: SubmissionServiceCreate['answers'][number]) {
    let answer_id: number

    const existing = await tx.formSubmissionAnswer.findUnique({
      where: {
        submission_id_field_id: {
          submission_id,
          field_id: answer.field_id,
        },
      },
    })

    if (existing) {
      await tx.formSubmissionAnswerOption.deleteMany({ where: { answer_id: existing.id } })
      await tx.formSubmissionAnswer.update({ where: { id: existing.id }, data: { value: answer.value ?? null } })
      answer_id = existing.id
    } else {
      const answerData = { submission_id, field_id: answer.field_id, value: answer.value }
      const created = await tx.formSubmissionAnswer.create({ data: answerData })
      answer_id = created.id
    }

    if (answer.option_ids?.length) {
      const data = answer.option_ids.map(option_id => ({ answer_id, option_id }))
      await tx.formSubmissionAnswerOption.createMany({ data })
    }
  }
}
