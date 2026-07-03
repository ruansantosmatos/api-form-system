import type { UpdatePublicationDto } from '../dto/update-publication.dto'

export type FormConfigStatus = {
  auth_required: boolean
  not_started: boolean
  expired: boolean
  is_open: boolean
  max_reached: boolean
  accepting_responses: boolean
  single_response: boolean
  allow_edit_response: boolean
}

export type PublicFieldOption = {
  id: number
  label: string
  value: string
}

export type PublicField = {
  id: number
  label: string
  required: boolean
  order: number
  type: string
  category: string
  options: PublicFieldOption[]
}

export type PublicSection = {
  id: number
  title: string | null
  description: string | null
  order: number
  fields: PublicField[]
}

export type PublicFormInfo = {
  id: number
  title: string
  description: string
}

export type PublicationInfo = {
  id: number
  hash: string
  form_id: number
  published_at: Date
  is_active: boolean
  config_status: FormConfigStatus
}

export type FormPublicResponse = {
  publication: PublicationInfo
  form: PublicFormInfo
  sections: PublicSection[]
  fields: PublicField[]
}

export interface PublicationServicePublish {
  form_id: number
}

export interface PublicationServiceGetPublication {
  form_id: number
}

export interface PublicationServiceGetByHash {
  hash: string
}

export interface PublicationServiceUpdatePublication {
  form_id: number
  data: UpdatePublicationDto
}

export interface PublicationServiceDeactivatePublication {
  form_id: number
}
