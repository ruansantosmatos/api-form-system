import { FormFieldOption } from 'src/generated/prisma/client'
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { findFieldInSection, findSectionInForm } from '../utils/section-lookup.util'
import type {
  SectionServiceGetSectionFieldOptions,
  SectionServiceCreateSectionFieldOption,
  SectionServiceUpdateSectionFieldOption,
  SectionServiceDeleteSectionFieldOption,
} from '../interface/section.interface'

@Injectable()
export class SectionFieldOptionService {
  constructor(private readonly prisma: PrismaClientService) {}

  async getSectionFieldOptions({ form_id, section_id, field_id }: SectionServiceGetSectionFieldOptions): Promise<FormFieldOption[]> {
    await findSectionInForm(this.prisma, section_id, form_id)
    await findFieldInSection(this.prisma, field_id, section_id)
    return this.prisma.formFieldOption.findMany({ where: { field_id }, orderBy: { id: 'asc' } })
  }

  async createSectionFieldOption({ form_id, section_id, field_id, data }: SectionServiceCreateSectionFieldOption): Promise<FormFieldOption> {
    await findSectionInForm(this.prisma, section_id, form_id)
    await findFieldInSection(this.prisma, field_id, section_id)
    return this.prisma.formFieldOption.create({ data: { ...data, field_id } })
  }

  async updateSectionFieldOption({
    form_id,
    section_id,
    field_id,
    option_id,
    data,
  }: SectionServiceUpdateSectionFieldOption): Promise<FormFieldOption> {
    await findSectionInForm(this.prisma, section_id, form_id)
    await findFieldInSection(this.prisma, field_id, section_id)

    const option = await this.prisma.formFieldOption.findUnique({ where: { id: option_id, field_id } })
    if (!option) throw new NotFoundException('Option not found')
    return this.prisma.formFieldOption.update({ where: { id: option_id }, data: { ...data, updated_at: new Date() } })
  }

  async deleteSectionFieldOption({ form_id, section_id, field_id, option_id }: SectionServiceDeleteSectionFieldOption): Promise<void> {
    await findSectionInForm(this.prisma, section_id, form_id)
    await findFieldInSection(this.prisma, field_id, section_id)

    const option = await this.prisma.formFieldOption.findUnique({ where: { id: option_id, field_id } })
    if (!option) throw new NotFoundException('Option not found')
    await this.prisma.formFieldOption.delete({ where: { id: option_id } })
  }
}
