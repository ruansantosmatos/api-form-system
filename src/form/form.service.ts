import { Form } from 'src/generated/prisma/client'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { FormServiceCreate, FormServiceGetAll, FormServiceGetForm, FormServiceUpdateForm, FormServiceDeleteForm, FormPaginatedResult, FormWithRelations } from './interface/form.interface'

@Injectable()
export class FormService {
  constructor(private readonly prisma: PrismaClientService) {}

  async getAll({ user_id, page, limit, sort }: FormServiceGetAll): Promise<FormPaginatedResult> {
    const skip = (page - 1) * limit

    const [forms, total] = await this.prisma.$transaction([
      this.prisma.form.findMany({
        skip,
        take: limit,
        where: { user_id },
        orderBy: { title: sort },
        select: { 
          id: true, 
          title: true, 
          published: true, 
          created_at: true, 
          updated_at: true, 
          description: true, 
          last_opened_at: true 
        },
      }),
      this.prisma.form.count({ where: { user_id } }),
    ])

    return {
      data: forms,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    }
  }

  async create({ data }: FormServiceCreate): Promise<Form> {
    return this.prisma.form.create({ data })
  }

  async getForm({ form_id }: FormServiceGetForm): Promise<FormWithRelations> {
    const fieldInclude = {
      category: { select: { id: true, name: true } },
      type: { select: { id: true, name: true } },
    }

    try {
      return await this.prisma.form.update({
        where: { id: form_id },
        data: { last_opened_at: new Date() },
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
    } catch {
      throw new NotFoundException('Form not found')
    }
  }

  async updateForm({ form_id, user_id, data }: FormServiceUpdateForm): Promise<Form> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException('Form not access')
    return this.prisma.form.update({ where: { id: form_id }, data: { ...data, updated_at: new Date() } })
  }

  async deleteForm({ form_id, user_id }: FormServiceDeleteForm): Promise<void> {
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
