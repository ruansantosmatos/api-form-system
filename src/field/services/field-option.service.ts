import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { Injectable, NotFoundException } from '@nestjs/common'
import type {
  FieldServiceGetFieldOptions,
  FieldServiceCreateFieldOption,
  FieldServiceUpdateFieldOption,
  FieldServiceDeleteFieldOption,
} from '../interface/field.interface'

@Injectable()
export class FieldOptionService {
  constructor(private readonly prisma: PrismaClientService) {}

  private async findFieldInForm(field_id: number, form_id: number) {
    const field = await this.prisma.formField.findFirst({
      where: { id: field_id, OR: [{ form_id }, { section: { form_id } }] },
    })

    if (!field) throw new NotFoundException('Field not found')
    return field
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
