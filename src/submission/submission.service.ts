import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import type { SubmissionServiceCreate, SubmissionServiceGetAll, SubmissionServiceGetOne } from './interface/submission.interface'

@Injectable()
export class SubmissionService {
  constructor(private readonly prisma: PrismaClientService) {}

  async create({ form_id, respondent_id, answers }: SubmissionServiceCreate) {
    await this.validateForm(form_id)
    await this.validateAnswers(form_id, answers)
    return this.persist(form_id, respondent_id, answers)
  }

  private async validateForm(form_id: number) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')
    if (!form.published) throw new UnprocessableEntityException('Form is not published')
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

  private async persist(form_id: number, respondent_id: number, answers: SubmissionServiceCreate['answers']) {
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

  async getAll({ form_id, user_id }: SubmissionServiceGetAll) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })

    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException()

    return this.prisma.formSubmission.findMany({
      where: { form_id },
      orderBy: { submitted_at: 'desc' },
      include: { _count: { select: { answers: true } } },
    })
  }

  async getOne({ form_id, submission_id, user_id }: SubmissionServiceGetOne) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })

    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException()

    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submission_id, form_id },
      include: {
        answers: {
          include: {
            field: { select: { id: true, label: true } },
            options: { select: { option_id: true, option: { select: { label: true, value: true } } } },
          },
        },
      },
    })

    if (!submission) throw new NotFoundException('Submission not found')
    return submission
  }
}
