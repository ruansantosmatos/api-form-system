import { Prisma } from 'src/generated/prisma/client'
import type { CreateFieldDto } from '../dto/create-field.dto'

export type FieldCategoryWithTypes = Prisma.FieldCategoryGetPayload<{
  select: {
    id: true
    name: true
    fieldTypes: { select: { id: true; name: true } }
  }
}>
import type { UpdateFieldItemDto } from '../dto/update-field.dto'
import type { CreateFieldOptionDto } from '../dto/create-field-option.dto'
import type { UpdateFieldOptionDto } from '../dto/update-field-option.dto'

export interface FieldServiceCreateFormField {
  form_id: number
  data: CreateFieldDto
}

export interface FieldServiceUpdateFormFields {
  form_id: number
  fields: UpdateFieldItemDto[]
}

export interface FieldServiceDeleteFormField {
  form_id: number
  field_id: number
}

export interface FieldServiceGetFieldOptions {
  form_id: number
  field_id: number
}

export interface FieldServiceCreateFieldOption {
  form_id: number
  field_id: number
  data: CreateFieldOptionDto
}

export interface FieldServiceUpdateFieldOption {
  form_id: number
  field_id: number
  option_id: number
  data: UpdateFieldOptionDto
}

export interface FieldServiceDeleteFieldOption {
  form_id: number
  field_id: number
  option_id: number
}
