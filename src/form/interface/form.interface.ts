import type { CreateFormDto } from '../dto/create-form.dto'
import type { UpdateFormDto } from '../dto/update-form.dto'
import type { CreateFormSectionDto } from '../dto/create-form-section.dto'
import type { UpdateFormSectionItemDto } from '../dto/update-form-section.dto'
import type { CreateFormSectionFieldDto } from '../dto/create-form-section-field.dto'
import type { UpdateFormSectionFieldItemDto } from '../dto/update-form-section-field.dto'
import type { CreateFormFieldOptionDto } from '../dto/create-form-field-option.dto'
import type { UpdateFormFieldOptionDto } from '../dto/update-form-field-option.dto'

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

export interface FormServiceGetFieldOptions {
  form_id: number
  field_id: number
}

export interface FormServiceCreateFieldOption {
  form_id: number
  field_id: number
  data: CreateFormFieldOptionDto
}

export interface FormServiceUpdateFieldOption {
  form_id: number
  field_id: number
  option_id: number
  data: UpdateFormFieldOptionDto
}

export interface FormServiceDeleteFieldOption {
  form_id: number
  field_id: number
  option_id: number
}
