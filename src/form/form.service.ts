import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import type {
  FormServiceCreate,
  FormServiceGetForm,
  FormServiceDeleteForm,
  FormServiceUpdateForm,
  FormServiceGetSections,
  FormServiceCreateSection,
  FormServiceDeleteSection,
  FormServiceUpdateSections,
  FormServiceCreateFormField,
  FormServiceDeleteFormField,
  FormServiceUpdateFormFields,
  FormServiceCreateSectionField,
  FormServiceUpdateSectionField,
  FormServiceDeleteSectionField,
} from './interface/form.interface'

@Injectable()
export class FormService {
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

  async create({ data }: FormServiceCreate) {
    const form = await this.prisma.form.create({ data })
    return form
  }

  async getForm({ form_id }: FormServiceGetForm) {
    const fieldInclude = {
      category: { select: { id: true, name: true } },
      type: { select: { id: true, name: true } },
    }

    const form = await this.prisma.form.findUnique({
      where: { id: form_id },
      include: {
        fields: {
          where: { section_id: null },
          orderBy: { order: 'asc' },
          include: fieldInclude,
        },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            fields: {
              orderBy: { order: 'asc' },
              include: fieldInclude,
            },
          },
        },
      },
    })

    if (!form) throw new NotFoundException('Form not found')
    return form
  }

  async updateForm({ form_id, user_id, data }: FormServiceUpdateForm) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException('Form not access')
    return this.prisma.form.update({ where: { id: form_id }, data: { ...data, updated_at: new Date() } })
  }

  async deleteForm({ form_id, user_id }: FormServiceDeleteForm) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })

    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException('Form not access')

    await this.prisma.$transaction([
      this.prisma.formField.deleteMany({ where: { form_id } }),
      this.prisma.formSection.deleteMany({ where: { form_id } }),
      this.prisma.form.delete({ where: { id: form_id } }),
    ])
  }

  async createFormField({ form_id, data }: FormServiceCreateFormField) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    await this.validateFieldRelations(data.category_id, data.type_id)

    return this.prisma.formField.create({
      data: { ...data, form_id },
      include: {
        category: { select: { id: true, name: true } },
        type: { select: { id: true, name: true } },
      },
    })
  }

  async updateFormFields({ form_id, fields }: FormServiceUpdateFormFields) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    await Promise.all(fields.map(({ category_id, type_id }) => this.validateFieldRelations(category_id, type_id)))

    const updated_at = new Date()
    return this.prisma.$transaction(
      fields.map(({ id, ...data }) => this.prisma.formField.update({ where: { id, form_id }, data: { ...data, updated_at } })),
    )
  }

  async deleteFormField({ form_id, field_id }: FormServiceDeleteFormField) {
    const field = await this.prisma.formField.findUnique({ where: { id: field_id, form_id } })
    if (!field) throw new NotFoundException('Field not found')

    await this.prisma.formField.delete({ where: { id: field_id } })
  }

  async createSection({ form_id, data }: FormServiceCreateSection) {
    const section = await this.prisma.formSection.create({ data: { ...data, form_id } })
    return section
  }

  async updateSections({ form_id, sections }: FormServiceUpdateSections) {
    const updated_at = new Date()
    return this.prisma.$transaction(
      sections.map(({ id, ...data }) => this.prisma.formSection.update({ where: { id, form_id }, data: { ...data, updated_at } })),
    )
  }

  async deleteSection({ form_id, section_id }: FormServiceDeleteSection) {
    return this.prisma.$transaction([
      this.prisma.formField.deleteMany({ where: { section_id } }),
      this.prisma.formSection.delete({ where: { id: section_id, form_id } }),
    ])
  }

  async getSections({ form_id }: FormServiceGetSections) {
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

  async createSectionField({ form_id, section_id, data }: FormServiceCreateSectionField) {
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

  async updateSectionField({ form_id, section_id, fields }: FormServiceUpdateSectionField) {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    await Promise.all(fields.map(({ category_id, type_id }) => this.validateFieldRelations(category_id, type_id)))

    const updated_at = new Date()
    return this.prisma.$transaction(
      fields.map(({ id, ...data }) => this.prisma.formField.update({ where: { id, section_id }, data: { ...data, updated_at } })),
    )
  }

  async deleteSectionField({ form_id, section_id, field_id }: FormServiceDeleteSectionField) {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')

    const field = await this.prisma.formField.findUnique({ where: { id: field_id, section_id } })
    if (!field) throw new NotFoundException('Field not found')

    await this.prisma.formField.delete({ where: { id: field_id } })
  }
}
