export type FormGenerationFieldOption = {
  label: string
  value: string
}

export type FormGenerationField = {
  label: string
  category: string
  type: string
  required: boolean
  options: FormGenerationFieldOption[]
}

export type FormGenerationSection = {
  title: string
  description: string
  fields: FormGenerationField[]
}

export type FormGenerationPayload = {
  title: string
  description: string
  sections: FormGenerationSection[]
}

export type AiGenerateFormInput = {
  apiKey: string
  modelSlug: string
  prompt: string
  systemPrompt: string
  maxOutputTokens: number
  supportsTemperature: boolean
  temperature: number | null
  topP: number | null
  frequencyPenalty: number | null
  presencePenalty: number | null
  responseSchema: Record<string, unknown>
}

export type AiGenerateFormUsage = {
  input_tokens: number
  output_tokens: number
}

export type AiGenerateFormOutput = {
  payload: FormGenerationPayload
  usage: AiGenerateFormUsage
}

export type AiProviderErrorKind = 'auth' | 'rate_limit' | 'invalid_output' | 'timeout' | 'insufficient_balance' | 'unknown'

export interface AiProviderAdapter {
  generateForm(input: AiGenerateFormInput): Promise<AiGenerateFormOutput>
}

export type AiUsageLogSuccessInput = {
  user_id: number
  provider_id: number
  model_id: number
  input_tokens: number
  output_tokens: number
  input_cost_per_million: number
  output_cost_per_million: number
}

export type AiUsageLogErrorInput = {
  user_id: number
  provider_id: number
  model_id: number
  error_message: string
}
