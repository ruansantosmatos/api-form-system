import { randomBytes } from 'crypto'
import { FormConfig, FormPublication } from 'src/generated/prisma/client'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  PublicField,
  FormConfigStatus,
  FormPublicResponse,
  PublicationServicePublish,
  PublicationServiceGetByHash,
  PublicationServiceGetPublication,
  PublicationServiceUpdatePublication,
  PublicationServiceDeactivatePublication,
} from './interface/publication.interface'

@Injectable()
export class PublicationService {
  constructor(private readonly prisma: PrismaClientService) {}

  private generateHash(): string {
    return randomBytes(32).toString('hex')
  }

  private async findPublication(form_id: number): Promise<FormPublication> {
    const publication = await this.prisma.formPublication.findUnique({ where: { form_id } })
    if (!publication) throw new NotFoundException('Publication not found')
    return publication
  }

  private computeConfigStatus(config: FormConfig | null, submissionCount: number, is_active: boolean): FormConfigStatus {
    if (!config) {
      return {
        auth_required: false,
        not_started: false,
        expired: false,
        is_open: true,
        max_reached: false,
        accepting_responses: is_active,
        single_response: false,
        allow_edit_response: false,
      }
    }

    const now = new Date()
    const not_started = config.starts_at !== null && now < config.starts_at
    const expired = config.expires_at !== null && now > config.expires_at
    const is_open = !not_started && !expired
    const max_reached = config.max_responses !== null && submissionCount >= config.max_responses

    return {
      expired,
      is_open,
      not_started,
      max_reached,
      auth_required: !config.allow_anonymous,
      allow_edit_response: config.allow_edit_response,
      single_response: config.single_response_per_user,
      accepting_responses: is_active && is_open && !max_reached,
    }
  }

  async publish({ form_id }: PublicationServicePublish): Promise<FormPublication> {
    const existing = await this.prisma.formPublication.findUnique({ where: { form_id } })
    if (existing) throw new ConflictException('This form has already been published')

    return this.prisma.$transaction(async tx => {
      await tx.form.update({ where: { id: form_id }, data: { published: true } })
      return tx.formPublication.create({ data: { form_id, hash: this.generateHash() } })
    })
  }

  async getPublication({ form_id }: PublicationServiceGetPublication): Promise<FormPublication | null> {
    return this.prisma.formPublication.findUnique({ where: { form_id } })
  }

  async updatePublication({ form_id, data }: PublicationServiceUpdatePublication): Promise<FormPublication> {
    await this.findPublication(form_id)
    return this.prisma.formPublication.update({ where: { form_id }, data })
  }

  async deactivatePublication({ form_id }: PublicationServiceDeactivatePublication): Promise<FormPublication> {
    await this.findPublication(form_id)

    return this.prisma.$transaction(async tx => {
      await tx.form.update({ where: { id: form_id }, data: { published: false } })
      return tx.formPublication.update({ where: { form_id }, data: { is_active: false } })
    })
  }

  async getByHash({ hash }: PublicationServiceGetByHash): Promise<FormPublicResponse> {
    const fieldSelect = {
      id: true,
      label: true,
      required: true,
      order: true,
      type: { select: { name: true } },
      category: { select: { name: true } },
      options: { select: { id: true, label: true, value: true } },
    } as const

    const publication = await this.prisma.formPublication.findUnique({
      where: { hash },
      include: {
        form: {
          select: {
            id: true,
            title: true,
            description: true,
            config: true,
            sections: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                fields: { orderBy: { order: 'asc' }, select: fieldSelect },
              },
            },
            fields: {
              where: { section_id: null },
              orderBy: { order: 'asc' },
              select: fieldSelect,
            },
          },
        },
      },
    })

    if (!publication) throw new NotFoundException('Publication not found')
    if (!publication.is_active) throw new GoneException('This form is no longer accepting responses')

    const submissionCount = await this.prisma.formSubmission.count({ where: { form_id: publication.form_id } })
    const { form, id, hash: pubHash, form_id, published_at, is_active } = publication
    const { config, sections, fields, ...formInfo } = form

    const toPublicField = (f: (typeof fields)[number]): PublicField => ({
      id: f.id,
      label: f.label,
      required: f.required,
      order: f.order,
      type: f.type.name,
      category: f.category.name,
      options: f.options,
    })

    return {
      publication: {
        id,
        hash: pubHash,
        form_id,
        published_at,
        is_active,
        config_status: this.computeConfigStatus(config, submissionCount, is_active),
      },
      form: formInfo,
      sections: sections.map(({ fields, ...s }) => ({ ...s, fields: fields.map(toPublicField) })),
      fields: fields.map(toPublicField),
    }
  }
}
