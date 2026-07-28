import { Injectable } from '@nestjs/common'
import { OpenAiCompatibleAdapter } from './openai-compatible.adapter'
import type { AiGenerateFormInput, AiGenerateFormOutput, AiProviderAdapter } from '../interface/ai-generation.interface'

@Injectable()
export class OpenAiAdapter implements AiProviderAdapter {
  private readonly delegate = new OpenAiCompatibleAdapter({ maxTokensField: 'max_completion_tokens' })

  generateForm(input: AiGenerateFormInput): Promise<AiGenerateFormOutput> {
    return this.delegate.generateForm(input)
  }
}
