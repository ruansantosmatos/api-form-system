import { GoogleAdapter } from './google.adapter'
import { OpenAiAdapter } from './openai.adapter'
import { DeepSeekAdapter } from './deepseek.adapter'
import { AnthropicAdapter } from './anthropic.adapter'
import { AI_PROVIDER } from 'src/shared/consts/ai-provider'
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import type { AiProviderAdapter } from '../interface/ai-generation.interface'

@Injectable()
export class AiProviderFactory {
  constructor(
    private readonly openAiAdapter: OpenAiAdapter,
    private readonly anthropicAdapter: AnthropicAdapter,
    private readonly googleAdapter: GoogleAdapter,
    private readonly deepSeekAdapter: DeepSeekAdapter,
  ) {}

  getAdapter(providerSlug: string): AiProviderAdapter {
    switch (providerSlug) {
      case AI_PROVIDER.OPENAI:
        return this.openAiAdapter
      case AI_PROVIDER.ANTHROPIC:
        return this.anthropicAdapter
      case AI_PROVIDER.GOOGLE:
        return this.googleAdapter
      case AI_PROVIDER.DEEPSEEK:
        return this.deepSeekAdapter
      default:
        throw new InternalServerErrorException(`No AI adapter registered for provider "${providerSlug}"`)
    }
  }
}
