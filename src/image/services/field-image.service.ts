import { R2Service } from 'src/shared/services/r2.service'
import { buildObjectKey } from '../utils/object-key.util'
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import type {
  ImageServiceRequestFieldImageUpload,
  ImageServiceGetFieldImage,
  ImageServiceDeleteFieldImage,
  ImageUploadResult,
  ImageDownloadResult,
} from '../interface/image.interface'

@Injectable()
export class FieldImageService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly r2: R2Service,
  ) {}

  private async findFieldInForm(field_id: number, form_id: number) {
    const field = await this.prisma.formField.findFirst({
      where: { id: field_id, OR: [{ form_id }, { section: { form_id } }] },
    })

    if (!field) throw new NotFoundException('Field not found')
    return field
  }

  async requestFieldImageUpload({ form_id, field_id, data }: ImageServiceRequestFieldImageUpload): Promise<ImageUploadResult> {
    await this.findFieldInForm(field_id, form_id)

    const existing = await this.prisma.image.findUnique({ where: { field_id } })
    if (existing) await this.r2.deleteObject({ key: existing.key })

    const key = buildObjectKey('fields', field_id, data.file_name)

    const image = await this.prisma.image.upsert({
      where: { field_id },
      create: { field_id, key, mime_type: data.content_type, size: data.size },
      update: { key, mime_type: data.content_type, size: data.size, updated_at: new Date() },
    })

    const upload_url = await this.r2.getUploadUrl({ key, contentType: data.content_type })
    return { image, upload_url }
  }

  async getFieldImage({ form_id, field_id }: ImageServiceGetFieldImage): Promise<ImageDownloadResult> {
    await this.findFieldInForm(field_id, form_id)

    const image = await this.prisma.image.findUnique({ where: { field_id } })
    if (!image) throw new NotFoundException('Image not found')

    const url = await this.r2.getDownloadUrl({ key: image.key })
    return { image, url }
  }

  async deleteFieldImage({ form_id, field_id }: ImageServiceDeleteFieldImage): Promise<void> {
    await this.findFieldInForm(field_id, form_id)

    const image = await this.prisma.image.findUnique({ where: { field_id } })
    if (!image) throw new NotFoundException('Image not found')

    await this.r2.deleteObject({ key: image.key })
    await this.prisma.image.delete({ where: { id: image.id } })
  }
}
