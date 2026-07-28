import { Injectable } from '@nestjs/common'
import { OpenAiCompatibleAdapter } from './openai-compatible.adapter'
import type { AiGenerateFormInput, AiGenerateFormOutput, AiProviderAdapter } from '../interface/ai-generation.interface'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

@Injectable()
export class DeepSeekAdapter implements AiProviderAdapter {
  private readonly delegate = new OpenAiCompatibleAdapter({ baseURL: DEEPSEEK_BASE_URL, maxTokensField: 'max_tokens' })

  generateForm(input: AiGenerateFormInput): Promise<AiGenerateFormOutput> {
    return this.delegate.generateForm(input)
  }
}
