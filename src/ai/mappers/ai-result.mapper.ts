import { Prisma } from 'src/generated/prisma/client'
import type { AiCredentialResult, AiModelConfigResult } from '../interface/ai.interface'

export type CredentialWithProvider = Prisma.UserAiCredentialGetPayload<{ include: { provider: true } }>

export type ModelConfigWithRelations = Prisma.UserAiModelConfigGetPayload<{
  include: { model: { include: { provider: true } } }
}>

export function toCredentialResult(credential: CredentialWithProvider): AiCredentialResult {
  return {
    id: credential.id,
    provider_id: credential.provider_id,
    provider_slug: credential.provider.slug,
    provider_name: credential.provider.name,
    label: credential.label,
    masked_api_key: `****${credential.api_key_last_four}`,
    last_used_at: credential.last_used_at,
    created_at: credential.created_at,
    updated_at: credential.updated_at,
  }
}

export function toModelConfigResult(config: ModelConfigWithRelations): AiModelConfigResult {
  return {
    id: config.id,
    model_id: config.model_id,
    model_slug: config.model.slug,
    model_name: config.model.name,
    provider_id: config.model.provider_id,
    provider_slug: config.model.provider.slug,
    max_output_tokens: config.max_output_tokens,
    temperature: config.temperature?.toNumber() ?? null,
    top_p: config.top_p?.toNumber() ?? null,
    frequency_penalty: config.frequency_penalty?.toNumber() ?? null,
    presence_penalty: config.presence_penalty?.toNumber() ?? null,
    system_prompt: config.system_prompt,
    is_active: config.is_active,
    created_at: config.created_at,
    updated_at: config.updated_at,
  }
}
