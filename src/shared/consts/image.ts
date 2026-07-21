export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

export const IMAGE_URL_EXPIRES_IN = {
  UPLOAD: 5 * 60,
  DOWNLOAD: 60 * 60,
}
