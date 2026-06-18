import { FormField, FormFieldOption, FormSection } from 'src/generated/prisma/client'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import type {
  SectionServiceCreateSection,
  SectionServiceUpdateSections,
  SectionServiceDeleteSection,
  SectionServiceGetSections,
  SectionServiceCreateSectionField,
  SectionServiceUpdateSectionField,
  SectionServiceDeleteSectionField,
  SectionServiceGetSectionFields,
  SectionServiceGetSectionFieldOptions,
  SectionServiceUpdateSectionFieldOption,
  SectionServiceDeleteSectionFieldOption,
  SectionServiceCreateSectionFieldOption,
  SectionWithFields,
  SectionFieldWithRelations,
} from './interface/section.interface'

@Injectable()
export class SectionService {
  constructor(private readonly prisma: PrismaClientService) {}

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

  async getSections({ form_id }: SectionServiceGetSections): Promise<SectionWithFields[]> {
    return this.prisma.formSection.findMany({
      where: { form_id },
      orderBy: { order: 'asc' },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    })
  }

  async getSectionFields({ form_id, section_id }: SectionServiceGetSectionFields): Promise<FormField[]> {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')
    return this.prisma.formField.findMany({ where: { section_id }, orderBy: { order: 'asc' } })
  }

  async createSection({ form_id, data }: SectionServiceCreateSection): Promise<FormSection> {
    const orderInUse = await this.prisma.formSection.findFirst({ where: { form_id, order: data.order } })
    if (orderInUse) throw new ConflictException('A section with this order already exists in the form')

    return this.prisma.$transaction(async (tx) => {
      const section = await tx.formSection.create({ data: { ...data, form_id } })

      await tx.formField.updateMany({
        where: { form_id, section_id: null },
        data: { section_id: section.id, form_id: null },
      })

      return section
    })
  }

  async updateSections({ form_id, sections }: SectionServiceUpdateSections): Promise<FormSection[]> {
    const updated_at = new Date()
    return this.prisma.$transaction(
      sections.map(({ id, ...data }) => this.prisma.formSection.update({ where: { id, form_id }, data: { ...data, updated_at } })),
    )
  }

  async deleteSection({ form_id, section_id }: SectionServiceDeleteSection): Promise<void> {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    await this.prisma.$transaction(async tx => {
      const fields = await tx.formField.findMany({ where: { section_id }, select: { id: true } })
      const fieldIds = fields.map(f => f.id)

      const answers = await tx.formSubmissionAnswer.findMany({
        where: { field_id: { in: fieldIds } },
        select: { id: true },
      })
      const answerIds = answers.map(a => a.id)

      await tx.formSubmissionAnswerOption.deleteMany({ where: { answer_id: { in: answerIds } } })
      await tx.formSubmissionAnswer.deleteMany({ where: { field_id: { in: fieldIds } } })
      await tx.formFieldOption.deleteMany({ where: { field_id: { in: fieldIds } } })
      await tx.formField.deleteMany({ where: { section_id } })
      await tx.formSection.delete({ where: { id: section_id } })
    })
  }

  async createSectionField({ form_id, section_id, data }: SectionServiceCreateSectionField): Promise<SectionFieldWithRelations> {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

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
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

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
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    const field = await this.prisma.formField.findUnique({ where: { id: field_id, section_id } })
    if (!field) throw new NotFoundException('Field not found')

    await this.prisma.$transaction(async tx => {
      const answers = await tx.formSubmissionAnswer.findMany({ where: { field_id }, select: { id: true } })
      const answerIds = answers.map(a => a.id)

      await tx.formSubmissionAnswerOption.deleteMany({ where: { answer_id: { in: answerIds } } })
      await tx.formSubmissionAnswer.deleteMany({ where: { field_id } })
      await tx.formFieldOption.deleteMany({ where: { field_id } })
      await tx.formField.delete({ where: { id: field_id } })
    })
  }

  async getSectionFieldOptions({ form_id, section_id, field_id }: SectionServiceGetSectionFieldOptions): Promise<FormFieldOption[]> {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    const field = await this.prisma.formField.findUnique({ where: { id: field_id, section_id } })
    if (!field) throw new NotFoundException('Field not found')

    return this.prisma.formFieldOption.findMany({ where: { field_id }, orderBy: { id: 'asc' } })
  }

  async updateSectionFieldOption({
    form_id,
    section_id,
    field_id,
    option_id,
    data,
  }: SectionServiceUpdateSectionFieldOption): Promise<FormFieldOption> {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    const field = await this.prisma.formField.findUnique({ where: { id: field_id, section_id } })
    if (!field) throw new NotFoundException('Field not found')

    const option = await this.prisma.formFieldOption.findUnique({ where: { id: option_id, field_id } })
    if (!option) throw new NotFoundException('Option not found')

    return this.prisma.formFieldOption.update({ where: { id: option_id }, data: { ...data, updated_at: new Date() } })
  }

  async deleteSectionFieldOption({ form_id, section_id, field_id, option_id }: SectionServiceDeleteSectionFieldOption): Promise<void> {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    const field = await this.prisma.formField.findUnique({ where: { id: field_id, section_id } })
    if (!field) throw new NotFoundException('Field not found')

    const option = await this.prisma.formFieldOption.findUnique({ where: { id: option_id, field_id } })
    if (!option) throw new NotFoundException('Option not found')

    await this.prisma.formFieldOption.delete({ where: { id: option_id } })
  }

  async createSectionFieldOption({ form_id, section_id, field_id, data }: SectionServiceCreateSectionFieldOption): Promise<FormFieldOption> {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    const field = await this.prisma.formField.findUnique({ where: { id: field_id, section_id } })
    if (!field) throw new NotFoundException('Field not found')

    return this.prisma.formFieldOption.create({ data: { ...data, field_id } })
  }
}
