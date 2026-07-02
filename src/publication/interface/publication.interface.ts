import { Prisma } from 'src/generated/prisma/client'
import type { UpdatePublicationDto } from '../dto/update-publication.dto'

const publicFormSelect = {
  include: {
    form: {
      select: {
        id: true,
        title: true,
        description: true,
        config: true,
      },
    },
  },
} as const

type FormPublicationRaw = Prisma.FormPublicationGetPayload<typeof publicFormSelect>

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

export type FormPublicationWithStatus = Omit<FormPublicationRaw, 'form'> & {
  config_status: FormConfigStatus
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
