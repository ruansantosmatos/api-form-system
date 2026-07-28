import { Injectable } from '@nestjs/common'
import { ApiError, GoogleGenAI } from '@google/genai'
import { AiProviderError } from './ai-provider.error'
import { parseFormGenerationPayload } from './parse-form-generation-payload'
import type { AiGenerateFormInput, AiGenerateFormOutput, AiProviderAdapter } from '../interface/ai-generation.interface'

@Injectable()
export class GoogleAdapter implements AiProviderAdapter {
  protected createClient(input: AiGenerateFormInput): GoogleGenAI {
    return new GoogleGenAI({ apiKey: input.apiKey })
  }

  async generateForm(input: AiGenerateFormInput): Promise<AiGenerateFormOutput> {
    const client = this.createClient(input)

    try {
      const response = await client.models.generateContent({
        model: input.modelSlug,
        contents: input.prompt,
        config: {
          systemInstruction: input.systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: input.responseSchema,
          maxOutputTokens: input.maxOutputTokens,
          ...(input.supportsTemperature && input.temperature != null ? { temperature: input.temperature } : {}),
          ...(input.supportsTemperature && input.topP != null ? { topP: input.topP } : {}),
          ...(input.frequencyPenalty != null ? { frequencyPenalty: input.frequencyPenalty } : {}),
          ...(input.presencePenalty != null ? { presencePenalty: input.presencePenalty } : {}),
        },
      })

      const payload = parseFormGenerationPayload(response.text)

      return {
        payload,
        usage: {
          input_tokens: response.usageMetadata?.promptTokenCount ?? 0,
          output_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
      }
    } catch (error) {
      if (error instanceof AiProviderError) throw error
      throw this.toProviderError(error)
    }
  }

  private toProviderError(error: unknown): AiProviderError {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return new AiProviderError('auth', 'The API key registered for this provider was rejected')
      }

      if (error.status === 429) {
        return new AiProviderError('rate_limit', 'The provider is rate-limiting this API key')
      }

      if (error.status >= 500) {
        return new AiProviderError('timeout', 'The provider is temporarily unavailable')
      }
    }

    const message = error instanceof Error ? error.message : 'Unknown provider error'
    return new AiProviderError('unknown', message)
  }
}
