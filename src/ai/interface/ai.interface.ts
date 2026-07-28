import type { UpdateModelConfigDto } from '../dto/update-model-config.dto'

export type AiMessageResult = { message: string }

export type AiModelCatalogItem = {
  id: number
  slug: string
  name: string
  description: string | null
  context_window: number
  max_output_tokens: number
  input_cost_per_million: number
  output_cost_per_million: number
  supports_temperature: boolean
  is_default: boolean
  is_in_use: boolean
}

export type AiCredentialResult = {
  id: number
  provider_id: number
  provider_slug: string
  provider_name: string
  label: string | null
  masked_api_key: string
  last_used_at: Date | null
  created_at: Date | null
  updated_at: Date | null
}

export type AiProviderCatalogItem = {
  id: number
  slug: string
  name: string
  description: string | null
  website_url: string | null
  credential: AiCredentialResult | null
  models: AiModelCatalogItem[]
}

export type AiModelConfigResult = {
  id: number
  model_id: number
  model_slug: string
  model_name: string
  provider_id: number
  provider_slug: string
  max_output_tokens: number
  temperature: number | null
  top_p: number | null
  frequency_penalty: number | null
  presence_penalty: number | null
  system_prompt: string | null
  is_active: boolean
  created_at: Date | null
  updated_at: Date | null
}

export type AiActiveModelResult = {
  active_model: AiModelConfigResult | null
}

export type AiServiceUpsertCredential = {
  user_id: number
  provider_id: number
  api_key: string
  label?: string
}

export type AiServiceDeleteCredential = {
  user_id: number
  provider_id: number
}

export type AiServiceActivateModel = {
  user_id: number
  model_id: number
}

export type AiServiceGetModelConfig = {
  user_id: number
  model_id: number
}

export type AiServiceUpdateModelConfig = {
  user_id: number
  model_id: number
  data: UpdateModelConfigDto
}
