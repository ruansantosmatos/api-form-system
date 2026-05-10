import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import type {
  SectionServiceCreateSection,
  SectionServiceUpdateSections,
  SectionServiceDeleteSection,
  SectionServiceGetSections,
  SectionServiceCreateSectionField,
  SectionServiceUpdateSectionField,
  SectionServiceDeleteSectionField,
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

  async getSections({ form_id }: SectionServiceGetSections) {
    return this.prisma.formSection.findMany({
      where: { form_id },
      orderBy: { order: 'asc' },
      include: {
        fields: {
          orderBy: { order: 'asc' },
          include: {
            category: { select: { id: true, name: true } },
            type: { select: { id: true, name: true } },
          },
        },
      },
    })
  }

  async createSection({ form_id, data }: SectionServiceCreateSection) {
    return this.prisma.formSection.create({ data: { ...data, form_id } })
  }

  async updateSections({ form_id, sections }: SectionServiceUpdateSections) {
    const updated_at = new Date()
    return this.prisma.$transaction(
      sections.map(({ id, ...data }) => this.prisma.formSection.update({ where: { id, form_id }, data: { ...data, updated_at } })),
    )
  }

  async deleteSection({ form_id, section_id }: SectionServiceDeleteSection) {
    return this.prisma.$transaction([
      this.prisma.formField.deleteMany({ where: { section_id } }),
      this.prisma.formSection.delete({ where: { id: section_id, form_id } }),
    ])
  }

  async createSectionField({ form_id, section_id, data }: SectionServiceCreateSectionField) {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    await this.validateFieldRelations(data.category_id, data.type_id)

    return this.prisma.formField.create({
      data: { ...data, section_id },
      include: {
        category: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    })
  }

  async updateSectionField({ form_id, section_id, fields }: SectionServiceUpdateSectionField) {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    await Promise.all(fields.map(({ category_id, type_id }) => this.validateFieldRelations(category_id, type_id)))

    const updated_at = new Date()
    return this.prisma.$transaction(
      fields.map(({ id, ...data }) => this.prisma.formField.update({ where: { id, section_id }, data: { ...data, updated_at } })),
    )
  }

  async deleteSectionField({ form_id, section_id, field_id }: SectionServiceDeleteSectionField) {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    const field = await this.prisma.formField.findUnique({ where: { id: field_id, section_id } })
    if (!field) throw new NotFoundException('Field not found')

    await this.prisma.formField.delete({ where: { id: field_id } })
  }
}
