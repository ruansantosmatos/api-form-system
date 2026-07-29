import { Module } from '@nestjs/common'
import { AiController } from './ai.controller'
import { AiAccessService } from './services/ai-access.service'
import { OpenAiAdapter } from './providers/openai.adapter'
import { GoogleAdapter } from './providers/google.adapter'
import { AiUsageService } from './services/ai-usage.service'
import { TokenModule } from 'src/shared/modules/token.module'
import { DeepSeekAdapter } from './providers/deepseek.adapter'
import { AiCatalogService } from './services/ai-catalog.service'
import { AnthropicAdapter } from './providers/anthropic.adapter'
import { AiProviderFactory } from './providers/ai-provider.factory'
import { AiCredentialService } from './services/ai-credential.service'
import { AiProviderErrorService } from './services/ai-provider-error.service'
import { AiModelConfigService } from './services/ai-model-config.service'

@Module({
  imports: [TokenModule],
  controllers: [AiController],
  exports: [AiCatalogService, AiCredentialService, AiModelConfigService, AiUsageService, AiProviderFactory, AiAccessService, AiProviderErrorService],
  providers: [
    AiCatalogService,
    AiCredentialService,
    AiModelConfigService,
    AiUsageService,
    AiProviderFactory,
    AiAccessService,
    AiProviderErrorService,
    OpenAiAdapter,
    AnthropicAdapter,
    GoogleAdapter,
    DeepSeekAdapter,
  ],
})
export class AiModule {}
