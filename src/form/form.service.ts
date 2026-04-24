import { Injectable } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import type {
  FormServiceCreate,
  FormServiceCreateSection,
  FormServiceUpdateSections,
  FormServiceDeleteSection,
  FormServiceGetSections,
} from './interface/form.interface'

@Injectable()
export class FormService {
  constructor(private readonly prisma: PrismaClientService) {}

  async create({ data }: FormServiceCreate) {
    const form = await this.prisma.form.create({ data })
    return form
  }

  async createSection({ form_id, data }: FormServiceCreateSection) {
    const section = await this.prisma.formSection.create({ data: { ...data, form_id } })
    return section
  }

  async updateSections({ form_id, sections }: FormServiceUpdateSections) {
    return this.prisma.$transaction(sections.map(({ id, ...data }) => this.prisma.formSection.update({ where: { id, form_id }, data })))
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
}
