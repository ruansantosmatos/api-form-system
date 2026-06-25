import { Prisma } from 'src/generated/prisma/client'
import type { UpdatePublicationDto } from '../dto/update-publication.dto'

const publicFormSelect = {
  include: {
    form: {
      select: {
        id: true,
        title: true,
        description: true,
        sections: {
          orderBy: { order: 'asc' as const },
          include: {
            fields: {
              orderBy: { order: 'asc' as const },
              include: { options: true },
            },
          },
        },
        fields: {
          where: { section_id: null },
          orderBy: { order: 'asc' as const },
          include: { options: true },
        },
      },
    },
  },
}

export type FormPublicationWithForm = Prisma.FormPublicationGetPayload<typeof publicFormSelect>

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
