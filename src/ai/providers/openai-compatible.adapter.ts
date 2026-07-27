import { AiProviderError } from './ai-provider.error'
import { parseFormGenerationPayload } from './parse-form-generation-payload'
import type { AiGenerateFormInput, AiGenerateFormOutput, AiProviderAdapter } from '../interface/ai-generation.interface'
import OpenAI, { AuthenticationError, PermissionDeniedError, RateLimitError, APIConnectionTimeoutError, APIConnectionError } from 'openai'

export type OpenAiCompatibleAdapterOptions = {
  /** Override for OpenAI-compatible providers (e.g. DeepSeek). Omit to hit the OpenAI API itself. */
  baseURL?: string
  /**
   * OpenAI's Chat Completions API deprecated `max_tokens` in favor of `max_completion_tokens`.
   * DeepSeek's OpenAI-compatible endpoint still expects the older `max_tokens` field.
   */
  maxTokensField: 'max_completion_tokens' | 'max_tokens'
}

/**
 * Shared implementation for any provider that speaks the OpenAI Chat Completions wire format
 * (OpenAI itself, and DeepSeek's OpenAI-compatible endpoint).
 */
export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  constructor(private readonly options: OpenAiCompatibleAdapterOptions) {}

  protected createClient(apiKey: string): OpenAI {
    return new OpenAI({ apiKey, ...(this.options.baseURL ? { baseURL: this.options.baseURL } : {}) })
  }

  async generateForm(input: AiGenerateFormInput): Promise<AiGenerateFormOutput> {
    const client = this.createClient(input.apiKey)
    const maxTokensParam =
      this.options.maxTokensField === 'max_tokens' ? { max_tokens: input.maxOutputTokens } : { max_completion_tokens: input.maxOutputTokens }

    try {
      const response = await client.chat.completions.create({
        model: input.modelSlug,
        ...maxTokensParam,
        messages: [
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: input.prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'form_generation', strict: true, schema: input.responseSchema },
        },
        ...(input.supportsTemperature && input.temperature != null ? { temperature: input.temperature } : {}),
        ...(input.supportsTemperature && input.topP != null ? { top_p: input.topP } : {}),
        ...(input.frequencyPenalty != null ? { frequency_penalty: input.frequencyPenalty } : {}),
        ...(input.presencePenalty != null ? { presence_penalty: input.presencePenalty } : {}),
      })

      const payload = parseFormGenerationPayload(response.choices[0]?.message?.content)

      return {
        payload,
        usage: {
          input_tokens: response.usage?.prompt_tokens ?? 0,
          output_tokens: response.usage?.completion_tokens ?? 0,
        },
      }
    } catch (error) {
      if (error instanceof AiProviderError) throw error
      throw this.toProviderError(error)
    }
  }

  private toProviderError(error: unknown): AiProviderError {
    if (error instanceof AuthenticationError || error instanceof PermissionDeniedError) {
      return new AiProviderError('auth', 'The API key registered for this provider was rejected')
    }

    if (error instanceof RateLimitError) {
      return new AiProviderError('rate_limit', 'The provider is rate-limiting this API key')
    }

    if (error instanceof APIConnectionTimeoutError || error instanceof APIConnectionError) {
      return new AiProviderError('timeout', 'Could not reach the provider in time')
    }

    const message = error instanceof Error ? error.message : 'Unknown provider error'
    return new AiProviderError('unknown', message)
  }
}
