import type { CreateFormDto } from '../dto/create-form.dto'
import type { UpdateFormDto } from '../dto/update-form.dto'

export interface FormServiceCreate {
  data: CreateFormDto
}

export interface FormServiceGetForm {
  form_id: number
}

export interface FormServiceUpdateForm {
  form_id: number
  user_id: number
  data: UpdateFormDto
}

export interface FormServiceDeleteForm {
  form_id: number
  user_id: number
}
