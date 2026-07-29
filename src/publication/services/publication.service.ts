import { randomBytes } from 'crypto'
import { FormPublication } from 'src/generated/prisma/client'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  PublicationServicePublish,
  PublicationServiceGetPublication,
  PublicationServiceUpdatePublication,
  PublicationServiceDeactivatePublication,
} from '../interface/publication.interface'

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
}
