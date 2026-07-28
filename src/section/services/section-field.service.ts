import { FormField } from 'src/generated/prisma/client'
import { R2Service } from 'src/shared/services/r2.service'
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { cloneOptionsForField } from '../utils/clone-options-for-field.util'
import { findFieldInSection, findSectionInForm } from '../utils/section-lookup.util'
import type {
  SectionServiceGetSectionFields,
  SectionServiceCreateSectionField,
  SectionServiceUpdateSectionField,
  SectionServiceDeleteSectionField,
  SectionServiceCloneSectionField,
  SectionFieldWithRelations,
} from '../interface/section.interface'

@Injectable()
export class SectionFieldService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly r2: R2Service,
  ) {}

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

  async getSectionFields({ form_id, section_id }: SectionServiceGetSectionFields): Promise<FormField[]> {
    await findSectionInForm(this.prisma, section_id, form_id)
    return this.prisma.formField.findMany({ where: { section_id }, orderBy: { order: 'asc' } })
  }

  async createSectionField({ form_id, section_id, data }: SectionServiceCreateSectionField): Promise<SectionFieldWithRelations> {
    await findSectionInForm(this.prisma, section_id, form_id)

    const orderInUse = await this.prisma.formField.findFirst({ where: { section_id, order: data.order } })
    if (orderInUse) throw new ConflictException('A field with this order already exists in the section')

    await this.validateFieldRelations(data.category_id, data.type_id)

    return this.prisma.formField.create({
      data: { ...data, section_id },
      include: {
        category: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    })
  }

  async updateSectionField({ form_id, section_id, fields }: SectionServiceUpdateSectionField): Promise<FormField[]> {
    await findSectionInForm(this.prisma, section_id, form_id)

    await Promise.all(fields.map(({ category_id, type_id }) => this.validateFieldRelations(category_id, type_id)))

    const currentFields = await this.prisma.formField.findMany({
      where: { id: { in: fields.map(f => f.id) }, section_id },
      select: { id: true, category_id: true },
    })

    const updated_at = new Date()
    return this.prisma.$transaction(async tx => {
      for (const current of currentFields) {
        const incoming = fields.find(f => f.id === current.id)
        if (incoming?.category_id !== undefined && incoming.category_id !== current.category_id) {
          const answers = await tx.formSubmissionAnswer.findMany({
            where: { field_id: current.id },
            select: { id: true },
          })
          const answerIds = answers.map(a => a.id)

          await tx.formSubmissionAnswerOption.deleteMany({ where: { answer_id: { in: answerIds } } })
          await tx.formFieldOption.deleteMany({ where: { field_id: current.id } })
        }
      }

      return Promise.all(fields.map(({ id, ...data }) => tx.formField.update({ where: { id, section_id }, data: { ...data, updated_at } })))
    })
  }

  async deleteSectionField({ form_id, section_id, field_id }: SectionServiceDeleteSectionField): Promise<void> {
    await findSectionInForm(this.prisma, section_id, form_id)
    await findFieldInSection(this.prisma, field_id, section_id)

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

  async cloneSectionField({ form_id, section_id, field_id }: SectionServiceCloneSectionField): Promise<FormField> {
    await findSectionInForm(this.prisma, section_id, form_id)

    const source = await this.prisma.formField.findUnique({
      where: { id: field_id, section_id },
      include: { options: true },
    })
    if (!source) throw new NotFoundException('Field not found')

    const nextOrder = source.order + 1

    return this.prisma.$transaction(async tx => {
      await tx.formField.updateMany({
        where: { section_id, order: { gte: nextOrder } },
        data: { order: { increment: 1 } },
      })

      const { id: _id, section_id: _sid, form_id: _fid, created_at: _ca, updated_at: _ua, options, ...fieldData } = source
      const cloned = await tx.formField.create({ data: { ...fieldData, section_id, order: nextOrder } })
      await cloneOptionsForField(tx, options, cloned.id)
      return cloned
    })
  }
}
