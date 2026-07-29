import { randomUUID } from 'crypto'

function sanitizeFileName(file_name: string): string {
  return file_name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-100)
}

export function buildObjectKey(scope: 'fields' | 'sections', id: number, file_name: string): string {
  return `${scope}/${id}/${randomUUID()}-${sanitizeFileName(file_name)}`
}
