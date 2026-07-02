import { Form, FormConfig } from 'src/generated/prisma/client'
import type { CreateFormDto } from '../dto/create-form.dto'
import type { UpdateFormDto } from '../dto/update-form.dto'
import type { UpdateFormConfigDto } from '../dto/update-form-config.dto'

export interface FormServiceCreate {
  data: CreateFormDto
}

export interface FormServiceGetAll {
  user_id: number
  page: number
  limit: number
  sort: 'asc' | 'desc'
  favorite?: boolean
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

export interface FormServiceToggleFavorite {
  form_id: number
  user_id: number
}

export interface FormServiceGetFormConfig {
  form_id: number
}

export interface FormServiceUpdateFormConfig {
  form_id: number
  user_id: number
  data: UpdateFormConfigDto
}

export type { FormConfig }

export type FormFavoriteResult = Pick<Form, 'id' | 'is_favorite'>

export type FormSummary = Pick<Form, 'id' | 'title' | 'description' | 'published' | 'is_favorite' | 'created_at' | 'updated_at' | 'last_opened_at'>

export type FormPaginatedResult = {
  data: FormSummary[]
  meta: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}
