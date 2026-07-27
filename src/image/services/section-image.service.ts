import { R2Service } from 'src/shared/services/r2.service'
import { buildObjectKey } from '../utils/object-key.util'
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import type {
  ImageServiceRequestSectionImageUpload,
  ImageServiceGetSectionImage,
  ImageServiceDeleteSectionImage,
  ImageUploadResult,
  ImageDownloadResult,
} from '../interface/image.interface'

@Injectable()
export class SectionImageService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly r2: R2Service,
  ) {}

  private async findSectionInForm(section_id: number, form_id: number) {
    const section = await this.prisma.formSection.findUnique({ where: { id: section_id, form_id } })
    if (!section) throw new NotFoundException('Section not found')
    return section
  }

  async requestSectionImageUpload({ form_id, section_id, data }: ImageServiceRequestSectionImageUpload): Promise<ImageUploadResult> {
    await this.findSectionInForm(section_id, form_id)

    const existing = await this.prisma.image.findUnique({ where: { section_id } })

    if (existing) await this.r2.deleteObject({ key: existing.key })

    const key = buildObjectKey('sections', section_id, data.file_name)

    const image = await this.prisma.image.upsert({
      where: { section_id },
      create: { section_id, key, mime_type: data.content_type, size: data.size },
      update: { key, mime_type: data.content_type, size: data.size, updated_at: new Date() },
    })

    const upload_url = await this.r2.getUploadUrl({ key, contentType: data.content_type })
    return { image, upload_url }
  }

  async getSectionImage({ form_id, section_id }: ImageServiceGetSectionImage): Promise<ImageDownloadResult> {
    await this.findSectionInForm(section_id, form_id)

    const image = await this.prisma.image.findUnique({ where: { section_id } })
    if (!image) throw new NotFoundException('Image not found')

    const url = await this.r2.getDownloadUrl({ key: image.key })
    return { image, url }
  }

  async deleteSectionImage({ form_id, section_id }: ImageServiceDeleteSectionImage): Promise<void> {
    await this.findSectionInForm(section_id, form_id)

    const image = await this.prisma.image.findUnique({ where: { section_id } })
    if (!image) throw new NotFoundException('Image not found')

    await this.r2.deleteObject({ key: image.key })
    await this.prisma.image.delete({ where: { id: image.id } })
  }
}
