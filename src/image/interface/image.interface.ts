import { Image } from 'src/generated/prisma/client'
import type { CreateImageDto } from '../dto/create-image.dto'

export interface ImageServiceRequestFieldImageUpload {
  form_id: number
  field_id: number
  data: CreateImageDto
}

export interface ImageServiceGetFieldImage {
  form_id: number
  field_id: number
}

export interface ImageServiceDeleteFieldImage {
  form_id: number
  field_id: number
}

export interface ImageServiceRequestSectionImageUpload {
  form_id: number
  section_id: number
  data: CreateImageDto
}

export interface ImageServiceGetSectionImage {
  form_id: number
  section_id: number
}

export interface ImageServiceDeleteSectionImage {
  form_id: number
  section_id: number
}

export interface ImageUploadResult {
  image: Image
  upload_url: string
}

export interface ImageDownloadResult {
  image: Image
  url: string
}
