import { FormField, FormFieldOption, Prisma } from 'src/generated/prisma/client'
import { R2Service } from 'src/shared/services/r2.service'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import type {
  FieldServiceGetFormFields,
  FieldServiceCreateFormField,
  FieldServiceUpdateFormFields,
  FieldServiceDeleteFormField,
  FieldServiceCloneFormField,
} from '../interface/field.interface'

@Injectable()
export class FormFieldService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly r2: R2Service,
  ) {}

  private async cloneOptionsForField(tx: Prisma.TransactionClient, options: FormFieldOption[], field_id: number): Promise<void> {
    if (options.length === 0) return
    await tx.formFieldOption.createMany({
      data: options.map(({ id: _id, field_id: _fid, created_at: _ca, updated_at: _ua, ...opt }) => ({ ...opt, field_id })),
    })
  }

  private async validateFieldRelations(category_id?: number, type_id?: number) {
    if (category_id === undefined && type_id === undefined) return

    const [category, fieldType] = await Promise.all([
      category_id !== undefined ? this.prisma.fieldCategory.findUnique({ where: { id: category_id } }) : Promise.resolve(null),
      type_id !== undefined ? this.prisma.fieldType.findUnique({ where: { id: type_id } }) : Promise.resolve(null),
    ])

    if (category_id !== undefined && !category) throw new NotFoundException('Category not found')

    if (type_id !== undefined && !fieldType) throw new NotFoundException('Field type not found')

    if (category_id !== undefined && fieldType && fieldType.category_id !== category_id)
      throw new UnprocessableEntityException('Field type does not belong to category')
  }

  async getFormFields({ form_id }: FieldServiceGetFormFields): Promise<FormField[]> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')
    return this.prisma.formField.findMany({ where: { form_id }, orderBy: { order: 'asc' } })
  }

  async createFormField({ form_id, data }: FieldServiceCreateFormField) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    await this.validateFieldRelations(data.category_id, data.type_id)

    const latestSection = await this.prisma.formSection.findFirst({
      where: { form_id },
      orderBy: { id: 'desc' },
    })

    return this.prisma.formField.create({
      data: { ...data, ...(latestSection ? { section_id: latestSection.id } : { form_id }) },
      include: {
        category: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    })
  }

  async updateFormFields({ form_id, fields }: FieldServiceUpdateFormFields): Promise<FormField[]> {
    const updated_at = new Date()
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    await Promise.all(fields.map(({ category_id, type_id }) => this.validateFieldRelations(category_id, type_id)))

    const currentFields = await this.prisma.formField.findMany({
      where: { id: { in: fields.map(f => f.id) }, form_id },
      select: { id: true, category_id: true },
    })

    return this.prisma.$transaction(async tx => {
      for (const current of currentFields) {
        const incoming = fields.find(f => f.id === current.id)
        if (incoming?.category_id !== undefined && incoming.category_id !== current.category_id) {
          const answers = await tx.formSubmissionAnswer.findMany({ where: { field_id: current.id }, select: { id: true } })
          const answerIds = answers.map(a => a.id)

          await tx.formSubmissionAnswerOption.deleteMany({ where: { answer_id: { in: answerIds } } })
          await tx.formFieldOption.deleteMany({ where: { field_id: current.id } })
        }
      }

      return Promise.all(fields.map(({ id, ...data }) => tx.formField.update({ where: { id, form_id }, data: { ...data, updated_at } })))
    })
  }

  async deleteFormField({ form_id, field_id }: FieldServiceDeleteFormField): Promise<void> {
    const field = await this.prisma.formField.findUnique({ where: { id: field_id, form_id } })
    if (!field) throw new NotFoundException('Field not found')

    const image = await this.prisma.image.findUnique({ where: { field_id } })
    if (image) await this.r2.deleteObject({ key: image.key })

    await this.prisma.$transaction(async tx => {
      const answers = await tx.formSubmissionAnswer.findMany({ where: { field_id }, select: { id: true } })
      const answerIds = answers.map(a => a.id)

      await tx.formSubmissionAnswerOption.deleteMany({ where: { answer_id: { in: answerIds } } })
      await tx.formSubmissionAnswer.deleteMany({ where: { field_id } })
      await tx.formFieldOption.deleteMany({ where: { field_id } })
      if (image) await tx.image.delete({ where: { id: image.id } })
      await tx.formField.delete({ where: { id: field_id } })
    })
  }

  async cloneFormField({ form_id, field_id }: FieldServiceCloneFormField): Promise<FormField> {
    const source = await this.prisma.formField.findUnique({
      where: { id: field_id, form_id, section_id: null },
      include: { options: true },
    })
    if (!source) throw new NotFoundException('Field not found')

    const nextOrder = source.order + 1

    return this.prisma.$transaction(async tx => {
      await tx.formField.updateMany({
        where: { form_id, section_id: null, order: { gte: nextOrder } },
        data: { order: { increment: 1 } },
      })

      const { id: _id, section_id: _sid, form_id: _fid, created_at: _ca, updated_at: _ua, options, ...fieldData } = source
      const cloned = await tx.formField.create({ data: { ...fieldData, form_id, order: nextOrder } })
      await this.cloneOptionsForField(tx, options, cloned.id)
      return cloned
    })
  }
}
