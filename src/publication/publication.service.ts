import { randomBytes } from 'crypto'
import { FormPublication } from 'src/generated/prisma/client'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  FormPublicationWithForm,
  PublicationServiceDeactivatePublication,
  PublicationServiceGetByHash,
  PublicationServiceGetPublication,
  PublicationServicePublish,
  PublicationServiceUpdatePublication,
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

  async publish({ form_id }: PublicationServicePublish): Promise<FormPublication> {
    const existing = await this.prisma.formPublication.findUnique({ where: { form_id } })
    if (existing) throw new ConflictException('This form has already been published')

    return this.prisma.formPublication.create({
      data: { form_id, hash: this.generateHash() },
    })
  }

  async getPublication({ form_id }: PublicationServiceGetPublication): Promise<FormPublication | null> {
    return this.prisma.formPublication.findUnique({ where: { form_id } })
  }

  async getByHash({ hash }: PublicationServiceGetByHash): Promise<FormPublicationWithForm> {
    const publication = await this.prisma.formPublication.findUnique({
      where: { hash },
      include: {
        form: {
          select: {
            id: true,
            title: true,
            description: true,
            sections: {
              orderBy: { order: 'asc' },
              include: {
                fields: {
                  orderBy: { order: 'asc' },
                  include: { options: true },
                },
              },
            },
            fields: {
              where: { section_id: null },
              orderBy: { order: 'asc' },
              include: { options: true },
            },
          },
        },
      },
    })

    if (!publication) throw new NotFoundException('Publication not found')
    if (!publication.is_active) throw new GoneException('This form is no longer accepting responses')

    return publication
  }

  async updatePublication({ form_id, data }: PublicationServiceUpdatePublication): Promise<FormPublication> {
    await this.findPublication(form_id)
    return this.prisma.formPublication.update({ where: { form_id }, data })
  }

  async deactivatePublication({ form_id }: PublicationServiceDeactivatePublication): Promise<FormPublication> {
    await this.findPublication(form_id)
    return this.prisma.formPublication.update({ where: { form_id }, data: { is_active: false } })
  }
}
