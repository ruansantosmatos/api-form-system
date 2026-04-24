import type { CreateFormDto } from '../dto/create-form.dto'
import type { CreateFormSectionDto } from '../dto/create-form-section.dto'
import type { UpdateFormSectionItemDto } from '../dto/update-form-section.dto'

export interface FormServiceCreate {
  data: CreateFormDto
}

export interface FormServiceCreateSection {
  form_id: number
  data: CreateFormSectionDto
}

export interface FormServiceUpdateSections {
  form_id: number
  sections: UpdateFormSectionItemDto[]
}

export interface FormServiceDeleteSection {
  form_id: number
  section_id: number
}

export interface FormServiceGetSections {
  form_id: number
}
