import type { CreateFormDto } from '../dto/create-form.dto'
import type { UpdateFormDto } from '../dto/update-form.dto'
import type { CreateFormSectionDto } from '../dto/create-form-section.dto'
import type { UpdateFormSectionItemDto } from '../dto/update-form-section.dto'
import type { CreateFormSectionFieldDto } from '../dto/create-form-section-field.dto'
import type { UpdateFormSectionFieldItemDto } from '../dto/update-form-section-field.dto'

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

export interface FormServiceGetForm {
  form_id: number
}

export interface FormServiceCreateSectionField {
  form_id: number
  section_id: number
  data: CreateFormSectionFieldDto
}

export interface FormServiceUpdateSectionField {
  form_id: number
  section_id: number
  fields: UpdateFormSectionFieldItemDto[]
}

export interface FormServiceDeleteSectionField {
  form_id: number
  section_id: number
  field_id: number
}

export interface FormServiceCreateFormField {
  form_id: number
  data: CreateFormSectionFieldDto
}

export interface FormServiceUpdateFormFields {
  form_id: number
  fields: UpdateFormSectionFieldItemDto[]
}

export interface FormServiceDeleteFormField {
  form_id: number
  field_id: number
}

export interface FormServiceDeleteForm {
  form_id: number
  user_id: number
}

export interface FormServiceUpdateForm {
  form_id: number
  user_id: number
  data: UpdateFormDto
}
