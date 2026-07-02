import { Form } from 'src/generated/prisma/client'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  FormServiceCreate,
  FormServiceGetAll,
  FormServiceGetForm,
  FormServiceUpdateForm,
  FormServiceDeleteForm,
  FormServiceToggleFavorite,
  FormServiceGetFormConfig,
  FormServiceUpdateFormConfig,
  FormFavoriteResult,
  FormPaginatedResult,
  FormConfig,
} from './interface/form.interface'

@Injectable()
export class FormService {
  constructor(private readonly prisma: PrismaClientService) {}

  async getAll({ user_id, page, limit, sort, favorite }: FormServiceGetAll): Promise<FormPaginatedResult> {
    const skip = (page - 1) * limit
    const where = { user_id, ...(favorite !== undefined && { is_favorite: favorite }) }

    const [forms, total] = await this.prisma.$transaction([
      this.prisma.form.findMany({
        skip,
        take: limit,
        where,
        orderBy: { title: sort },
        select: {
          id: true,
          title: true,
          published: true,
          is_favorite: true,
          created_at: true,
          updated_at: true,
          description: true,
          last_opened_at: true,
        },
      }),
      this.prisma.form.count({ where }),
    ])

    return {
      data: forms,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    }
  }

  async toggleFavorite({ form_id, user_id }: FormServiceToggleFavorite): Promise<FormFavoriteResult> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')
    if (form.user_id !== user_id) throw new ForbiddenException('Form not access')

    return this.prisma.form.update({
      where: { id: form_id },
      data: { is_favorite: !form.is_favorite },
      select: { id: true, is_favorite: true },
    })
  }

  async create({ data }: FormServiceCreate): Promise<Form> {
    return this.prisma.form.create({ data: { ...data, config: { create: {} } } })
  }

  async getForm({ form_id }: FormServiceGetForm): Promise<Form> {
    try {
      return await this.prisma.form.update({
        where: { id: form_id },
        data: { last_opened_at: new Date() },
      })
    } catch {
      throw new NotFoundException('Form not found')
    }
  }

  async updateForm({ form_id, user_id, data }: FormServiceUpdateForm): Promise<Form> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException('Form not access')
    return this.prisma.form.update({ where: { id: form_id }, data: { ...data, updated_at: new Date() } })
  }

  async getFormConfig({ form_id }: FormServiceGetFormConfig): Promise<FormConfig> {
    const config = await this.prisma.formConfig.findUnique({ where: { form_id } })
    if (!config) throw new NotFoundException('Form config not found')
    return config
  }

  async updateFormConfig({ form_id, user_id, data }: FormServiceUpdateFormConfig): Promise<FormConfig> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException('Form not access')
    return this.prisma.formConfig.update({ where: { form_id }, data })
  }

  async deleteForm({ form_id, user_id }: FormServiceDeleteForm): Promise<void> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })

    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException('Form not access')

    await this.prisma.$transaction(async tx => {
      const submissions = await tx.formSubmission.findMany({
        where: { form_id },
        select: { id: true },
      })
      const submissionIds = submissions.map(s => s.id)

      const fields = await tx.formField.findMany({
        where: { form_id },
        select: { id: true },
      })
      const fieldIds = fields.map(f => f.id)

      const answers = await tx.formSubmissionAnswer.findMany({
        where: { submission_id: { in: submissionIds } },
        select: { id: true },
      })
      const answerIds = answers.map(a => a.id)

      await tx.formSubmissionAnswerOption.deleteMany({ where: { answer_id: { in: answerIds } } })
      await tx.formSubmissionAnswer.deleteMany({ where: { submission_id: { in: submissionIds } } })
      await tx.formSubmission.deleteMany({ where: { form_id } })
      await tx.formFieldOption.deleteMany({ where: { field_id: { in: fieldIds } } })
      await tx.formField.deleteMany({ where: { form_id } })
      await tx.formSection.deleteMany({ where: { form_id } })
      await tx.formPublication.deleteMany({ where: { form_id } })
      await tx.form.delete({ where: { id: form_id } })
    })
  }
}
