import { FormField, FormSection } from 'src/generated/prisma/client'
import { NotFoundException } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'

export async function findSectionInForm(
  prisma: PrismaClientService,
  section_id: number,
  form_id: number,
  message = 'Section not found',
): Promise<FormSection> {
  const section = await prisma.formSection.findUnique({ where: { id: section_id, form_id } })
  if (!section) throw new NotFoundException(message)
  return section
}

export async function findFieldInSection(prisma: PrismaClientService, field_id: number, section_id: number): Promise<FormField> {
  const field = await prisma.formField.findUnique({ where: { id: field_id, section_id } })
  if (!field) throw new NotFoundException('Field not found')
  return field
}
