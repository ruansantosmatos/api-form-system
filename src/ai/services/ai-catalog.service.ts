import { Injectable } from '@nestjs/common'
import { toCredentialResult } from '../mappers/ai-result.mapper'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import type { AiProviderCatalogItem } from '../interface/ai.interface'

@Injectable()
export class AiCatalogService {
  constructor(private readonly prisma: PrismaClientService) {}

  async getCatalog(user_id: number): Promise<AiProviderCatalogItem[]> {
    const [providers, credentials, activeConfig] = await Promise.all([
      this.prisma.aiProvider.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
        include: { models: { where: { is_active: true }, orderBy: { name: 'asc' } } },
      }),
      this.prisma.userAiCredential.findMany({ where: { user_id }, include: { provider: true } }),
      this.prisma.userAiModelConfig.findFirst({ where: { user_id, is_active: true }, select: { model_id: true } }),
    ])

    return providers.map(provider => {
      const credential = credentials.find(item => item.provider_id === provider.id)

      return {
        id: provider.id,
        slug: provider.slug,
        name: provider.name,
        description: provider.description,
        website_url: provider.website_url,
        credential: credential ? toCredentialResult(credential) : null,
        models: provider.models.map(model => ({
          id: model.id,
          slug: model.slug,
          name: model.name,
          description: model.description,
          context_window: model.context_window,
          max_output_tokens: model.max_output_tokens,
          input_cost_per_million: model.input_cost_per_million.toNumber(),
          output_cost_per_million: model.output_cost_per_million.toNumber(),
          supports_temperature: model.supports_temperature,
          is_default: model.is_default,
          is_in_use: activeConfig?.model_id === model.id,
        })),
      }
    })
  }
}
