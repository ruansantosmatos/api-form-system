import { Module } from '@nestjs/common'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'
import { AiUsageService } from './ai-usage.service'
import { TokenModule } from 'src/shared/modules/token.module'
import { GoogleAdapter } from './providers/google.adapter'
import { OpenAiAdapter } from './providers/openai.adapter'
import { DeepSeekAdapter } from './providers/deepseek.adapter'
import { AnthropicAdapter } from './providers/anthropic.adapter'
import { AiProviderFactory } from './providers/ai-provider.factory'

@Module({
  imports: [TokenModule],
  providers: [AiService, AiUsageService, AiProviderFactory, OpenAiAdapter, AnthropicAdapter, GoogleAdapter, DeepSeekAdapter],
  controllers: [AiController],
  exports: [AiService, AiUsageService, AiProviderFactory],
})
export class AiModule {}
