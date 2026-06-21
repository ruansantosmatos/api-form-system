import { Prisma } from 'src/generated/prisma/client'
import type { CreateSectionDto } from '../dto/create-section.dto'
import type { UpdateSectionItemDto } from '../dto/update-section.dto'
import type { CreateFieldDto } from 'src/field/dto/create-field.dto'
import type { UpdateFieldItemDto } from 'src/field/dto/update-field.dto'
import type { CreateFieldOptionDto } from 'src/field/dto/create-field-option.dto'
import type { UpdateFieldOptionDto } from 'src/field/dto/update-field-option.dto'

const fieldRelationsSelect = {
  include: {
    category: { select: { id: true as const, name: true as const } },
    type: { select: { id: true as const, name: true as const } },
  },
}

export type SectionWithFields = Prisma.FormSectionGetPayload<{
  include: { fields: true }
}>

export type SectionFieldWithRelations = Prisma.FormFieldGetPayload<typeof fieldRelationsSelect>

export interface SectionServiceCreateSection {
  form_id: number
  data: CreateSectionDto
}

export interface SectionServiceUpdateSections {
  form_id: number
  sections: UpdateSectionItemDto[]
}

export interface SectionServiceDeleteSection {
  form_id: number
  section_id: number
}

export interface SectionServiceGetSections {
  form_id: number
}

export interface SectionServiceGetSectionFields {
  form_id: number
  section_id: number
}

export interface SectionServiceCreateSectionField {
  form_id: number
  section_id: number
  data: CreateFieldDto
}

export interface SectionServiceUpdateSectionField {
  form_id: number
  section_id: number
  fields: UpdateFieldItemDto[]
}

export interface SectionServiceDeleteSectionField {
  form_id: number
  section_id: number
  field_id: number
}

export interface SectionServiceGetSectionFieldOptions {
  form_id: number
  section_id: number
  field_id: number
}

export interface SectionServiceUpdateSectionFieldOption {
  form_id: number
  section_id: number
  field_id: number
  option_id: number
  data: UpdateFieldOptionDto
}

export interface SectionServiceDeleteSectionFieldOption {
  form_id: number
  section_id: number
  field_id: number
  option_id: number
}

export interface SectionServiceCreateSectionFieldOption {
  form_id: number
  section_id: number
  field_id: number
  data: CreateFieldOptionDto
}

export interface SectionServiceCloneSection {
  form_id: number
  section_id: number
}

export interface SectionServiceCloneSectionField {
  form_id: number
  section_id: number
  field_id: number
}
