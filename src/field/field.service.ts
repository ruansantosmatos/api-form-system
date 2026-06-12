import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import type {
  FieldServiceCreateFormField,
  FieldServiceUpdateFormFields,
  FieldServiceDeleteFormField,
  FieldServiceGetFieldOptions,
  FieldServiceCreateFieldOption,
  FieldServiceUpdateFieldOption,
  FieldServiceDeleteFieldOption,
  FieldCategoryWithTypes,
} from './interface/field.interface'

@Injectable()
export class FieldService {
  constructor(private readonly prisma: PrismaClientService) {}

  private async findFieldInForm(field_id: number, form_id: number) {
    const field = await this.prisma.formField.findFirst({
      where: { id: field_id, OR: [{ form_id }, { section: { form_id } }] },
    })

    if (!field) throw new NotFoundException('Field not found')
    return field
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

  async getFieldCategories(): Promise<FieldCategoryWithTypes[]> {
    return this.prisma.fieldCategory.findMany({
      select: {
        id: true,
        name: true,
        fieldTypes: { select: { id: true, name: true } },
      },
    })
  }

  async createFormField({ form_id, data }: FieldServiceCreateFormField) {
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

  async updateFormFields({ form_id, fields }: FieldServiceUpdateFormFields) {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    await Promise.all(fields.map(({ category_id, type_id }) => this.validateFieldRelations(category_id, type_id)))

    const updated_at = new Date()
    return this.prisma.$transaction(
      fields.map(({ id, ...data }) => this.prisma.formField.update({ where: { id, form_id }, data: { ...data, updated_at } })),
    )
  }

  async deleteFormField({ form_id, field_id }: FieldServiceDeleteFormField) {
    const field = await this.prisma.formField.findUnique({ where: { id: field_id, form_id } })
    if (!field) throw new NotFoundException('Field not found')

    await this.prisma.formField.delete({ where: { id: field_id } })
  }

  async getFieldOptions({ form_id, field_id }: FieldServiceGetFieldOptions) {
    await this.findFieldInForm(field_id, form_id)
    return this.prisma.formFieldOption.findMany({ where: { field_id }, orderBy: { id: 'asc' } })
  }

  async createFieldOption({ form_id, field_id, data }: FieldServiceCreateFieldOption) {
    await this.findFieldInForm(field_id, form_id)
    return this.prisma.formFieldOption.create({ data: { ...data, field_id } })
  }

  async updateFieldOption({ form_id, field_id, option_id, data }: FieldServiceUpdateFieldOption) {
    await this.findFieldInForm(field_id, form_id)

    const option = await this.prisma.formFieldOption.findUnique({ where: { id: option_id, field_id } })
    if (!option) throw new NotFoundException('Option not found')

    return this.prisma.formFieldOption.update({ where: { id: option_id }, data: { ...data, updated_at: new Date() } })
  }

  async deleteFieldOption({ form_id, field_id, option_id }: FieldServiceDeleteFieldOption) {
    await this.findFieldInForm(field_id, form_id)

    const option = await this.prisma.formFieldOption.findUnique({ where: { id: option_id, field_id } })
    if (!option) throw new NotFoundException('Option not found')

    await this.prisma.formFieldOption.delete({ where: { id: option_id } })
  }
}
