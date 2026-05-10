import type { CreateSectionDto } from '../dto/create-section.dto'
import type { UpdateSectionItemDto } from '../dto/update-section.dto'
import type { CreateFieldDto } from 'src/field/dto/create-field.dto'
import type { UpdateFieldItemDto } from 'src/field/dto/update-field.dto'

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
