import { FormSection } from 'src/generated/prisma/client'
import { R2Service } from 'src/shared/services/r2.service'
import { findSectionInForm } from '../utils/section-lookup.util'
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { cloneOptionsForField } from '../utils/clone-options-for-field.util'
import type {
  SectionServiceCreateSection,
  SectionServiceUpdateSections,
  SectionServiceDeleteSection,
  SectionServiceGetSections,
  SectionServiceCloneSection,
  SectionServiceMergeSections,
  SectionWithFields,
} from '../interface/section.interface'

@Injectable()
export class SectionService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly r2: R2Service,
  ) {}

  async getSections({ form_id }: SectionServiceGetSections): Promise<SectionWithFields[]> {
    return this.prisma.formSection.findMany({
      where: { form_id },
      orderBy: { order: 'asc' },
      include: {
        fields: { orderBy: { order: 'asc' } },
      },
    })
  }

  async createSection({ form_id, data }: SectionServiceCreateSection): Promise<FormSection> {
    const orderInUse = await this.prisma.formSection.findFirst({ where: { form_id, order: data.order } })
    if (orderInUse) throw new ConflictException('A section with this order already exists in the form')

    return this.prisma.$transaction(async tx => {
      const section = await tx.formSection.create({ data: { ...data, form_id } })

      await tx.formField.updateMany({
        where: { form_id, section_id: null },
        data: { section_id: section.id, form_id: null },
      })

      return section
    })
  }

  async updateSections({ form_id, sections }: SectionServiceUpdateSections): Promise<FormSection[]> {
    const updated_at = new Date()
    return this.prisma.$transaction(
      sections.map(({ id, ...data }) => this.prisma.formSection.update({ where: { id, form_id }, data: { ...data, updated_at } })),
    )
  }

  async deleteSection({ form_id, section_id }: SectionServiceDeleteSection): Promise<void> {
    await findSectionInForm(this.prisma, section_id, form_id)

    const fields = await this.prisma.formField.findMany({ where: { section_id }, select: { id: true } })
    const fieldIds = fields.map(f => f.id)

    const images = await this.prisma.image.findMany({
      where: { OR: [{ section_id }, { field_id: { in: fieldIds } }] },
    })

    await Promise.all(images.map(image => this.r2.deleteObject({ key: image.key })))

    await this.prisma.$transaction(async tx => {
      const answers = await tx.formSubmissionAnswer.findMany({
        where: { field_id: { in: fieldIds } },
        select: { id: true },
      })
      const answerIds = answers.map(a => a.id)

      await tx.formSubmissionAnswerOption.deleteMany({ where: { answer_id: { in: answerIds } } })
      await tx.formSubmissionAnswer.deleteMany({ where: { field_id: { in: fieldIds } } })
      await tx.formFieldOption.deleteMany({ where: { field_id: { in: fieldIds } } })
      await tx.image.deleteMany({ where: { id: { in: images.map(i => i.id) } } })
      await tx.formField.deleteMany({ where: { section_id } })
      await tx.formSection.delete({ where: { id: section_id } })
    })
  }

  async cloneSection({ form_id, section_id }: SectionServiceCloneSection): Promise<SectionWithFields> {
    const source = await this.prisma.formSection.findUnique({
      where: { id: section_id, form_id },
      include: { fields: { orderBy: { order: 'asc' }, include: { options: true } } },
    })
    if (!source) throw new NotFoundException('Section not found')

    const nextOrder = source.order + 1

    return this.prisma.$transaction(async tx => {
      await tx.formSection.updateMany({
        where: { form_id, order: { gte: nextOrder } },
        data: { order: { increment: 1 } },
      })

      const cloned = await tx.formSection.create({
        data: { form_id, order: nextOrder, title: source.title, description: source.description },
      })

      for (const { id: _id, section_id: _sid, form_id: _fid, created_at: _ca, updated_at: _ua, options, ...fieldData } of source.fields) {
        const clonedField = await tx.formField.create({ data: { ...fieldData, section_id: cloned.id } })
        await cloneOptionsForField(tx, options, clonedField.id)
      }

      return tx.formSection.findUniqueOrThrow({
        where: { id: cloned.id },
        include: { fields: { orderBy: { order: 'asc' } } },
      })
    })
  }

  async mergeSections({ form_id, source_id, target_id }: SectionServiceMergeSections): Promise<SectionWithFields> {
    if (source_id === target_id) throw new UnprocessableEntityException('Source and target sections must be different')

    const [source, target] = await Promise.all([
      this.prisma.formSection.findUnique({ where: { id: source_id, form_id } }),
      this.prisma.formSection.findUnique({ where: { id: target_id, form_id } }),
    ])

    if (!source) throw new NotFoundException('Source section not found')

    if (!target) throw new NotFoundException('Target section not found')

    const sourceFields = await this.prisma.formField.findMany({
      where: { section_id: source_id },
      orderBy: { order: 'asc' },
      select: { id: true },
    })

    const { _max } = await this.prisma.formField.aggregate({
      where: { section_id: target_id },
      _max: { order: true },
    })
    const baseOrder = _max.order ?? 0

    return this.prisma.$transaction(async tx => {
      const updated_at = new Date()
      for (let i = 0; i < sourceFields.length; i++) {
        await tx.formField.update({
          where: { id: sourceFields[i].id },
          data: { section_id: target_id, order: baseOrder + i + 1, updated_at },
        })
      }

      await tx.formSection.delete({ where: { id: source_id } })

      return tx.formSection.findUniqueOrThrow({
        where: { id: target_id },
        include: { fields: { orderBy: { order: 'asc' } } },
      })
    })
  }
}
