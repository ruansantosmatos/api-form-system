import { AiProviderError } from './ai-provider.error'
import type { FormGenerationPayload } from '../interface/ai-generation.interface'

function isFieldOption(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).label === 'string' &&
    typeof (value as Record<string, unknown>).value === 'string'
  )
}

function isField(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const field = value as Record<string, unknown>

  return (
    typeof field.label === 'string' &&
    typeof field.category === 'string' &&
    typeof field.type === 'string' &&
    typeof field.required === 'boolean' &&
    Array.isArray(field.options) &&
    field.options.every(isFieldOption)
  )
}

function isSection(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const section = value as Record<string, unknown>

  return (
    typeof section.title === 'string' && typeof section.description === 'string' && Array.isArray(section.fields) && section.fields.every(isField)
  )
}

/**
 * Every provider is asked for the same JSON shape via its own structured-output mechanism, so
 * parsing/validating the raw text response is identical regardless of which adapter produced it.
 */
export function parseFormGenerationPayload(raw: string | null | undefined): FormGenerationPayload {
  if (!raw) throw new AiProviderError('invalid_output', 'The provider returned an empty response')

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new AiProviderError('invalid_output', 'The provider response is not valid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null) throw new AiProviderError('invalid_output', 'The provider response is not a JSON object')

  const payload = parsed as Record<string, unknown>
  const isValid =
    typeof payload.title === 'string' &&
    typeof payload.description === 'string' &&
    Array.isArray(payload.sections) &&
    payload.sections.every(isSection)

  if (!isValid) throw new AiProviderError('invalid_output', 'The provider response does not match the expected form schema')

  return parsed as FormGenerationPayload
}
