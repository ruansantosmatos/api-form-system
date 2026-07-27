import { Injectable } from '@nestjs/common'
import { AiProviderError } from './ai-provider.error'
import { parseFormGenerationPayload } from './parse-form-generation-payload'
import type { AiGenerateFormInput, AiGenerateFormOutput, AiProviderAdapter } from '../interface/ai-generation.interface'
import Anthropic, {
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
  APIConnectionTimeoutError,
  APIConnectionError,
} from '@anthropic-ai/sdk'

@Injectable()
export class AnthropicAdapter implements AiProviderAdapter {
  protected createClient(input: AiGenerateFormInput): Anthropic {
    return new Anthropic({ apiKey: input.apiKey })
  }

  async generateForm(input: AiGenerateFormInput): Promise<AiGenerateFormOutput> {
    const client = this.createClient(input)

    try {
      const response = await client.messages.create({
        model: input.modelSlug,
        max_tokens: input.maxOutputTokens,
        system: input.systemPrompt,
        messages: [{ role: 'user', content: input.prompt }],
        output_config: { format: { type: 'json_schema', schema: input.responseSchema } },
        ...(input.supportsTemperature && input.temperature != null ? { temperature: input.temperature } : {}),
        ...(input.supportsTemperature && input.topP != null ? { top_p: input.topP } : {}),
      })

      if (response.stop_reason === 'refusal') {
        throw new AiProviderError('invalid_output', 'The provider declined to generate a form for this prompt')
      }

      const textBlock = response.content.find(block => block.type === 'text')
      const payload = parseFormGenerationPayload(textBlock?.text)

      return {
        payload,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
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
