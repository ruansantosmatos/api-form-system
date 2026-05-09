import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { FormServiceCreate, FormServiceGetForm, FormServiceUpdateForm, FormServiceDeleteForm } from './interface/form.interface'

@Injectable()
export class FormService {
  constructor(private readonly prisma: PrismaClientService) {}

  async create({ data }: FormServiceCreate) {
    return this.prisma.form.create({ data })
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
}
