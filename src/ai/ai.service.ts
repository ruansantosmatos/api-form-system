import { Prisma } from 'src/generated/prisma/client'
import { CryptoService } from 'src/shared/services/crypto.service'
import { AI_API_KEY_PATTERN } from 'src/shared/consts/ai-provider'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  AiActiveModelResult,
  AiCredentialResult,
  AiMessageResult,
  AiModelConfigResult,
  AiProviderCatalogItem,
  AiServiceActivateModel,
  AiServiceDeleteCredential,
  AiServiceGetModelConfig,
  AiServiceUpdateModelConfig,
  AiServiceUpsertCredential,
} from './interface/ai.interface'

type CredentialWithProvider = Prisma.UserAiCredentialGetPayload<{ include: { provider: true } }>

type ModelConfigWithRelations = Prisma.UserAiModelConfigGetPayload<{
  include: { model: { include: { provider: true } } }
}>

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly cryptoService: CryptoService,
  ) {}

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
        credential: credential ? this.toCredentialResult(credential) : null,
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

  async getCredentials(user_id: number): Promise<AiCredentialResult[]> {
    const credentials = await this.prisma.userAiCredential.findMany({
      where: { user_id },
      orderBy: { provider: { name: 'asc' } },
      include: { provider: true },
    })

    return credentials.map(credential => this.toCredentialResult(credential))
  }

  async upsertCredential({ user_id, provider_id, api_key, label }: AiServiceUpsertCredential): Promise<AiCredentialResult> {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id: provider_id } })
    if (!provider || !provider.is_active) throw new NotFoundException('AI provider not found')

    const pattern = AI_API_KEY_PATTERN[provider.slug]
    if (pattern && !pattern.test(api_key)) throw new BadRequestException(`Invalid API key format for ${provider.name}`)

    const data = {
      label: label ?? null,
      api_key_encrypted: this.cryptoService.encrypt(api_key),
      api_key_last_four: api_key.slice(-4),
    }

    const credential = await this.prisma.userAiCredential.upsert({
      where: { user_id_provider_id: { user_id, provider_id } },
      create: { user_id, provider_id, ...data },
      update: { ...data, updated_at: new Date() },
      include: { provider: true },
    })

    return this.toCredentialResult(credential)
  }

  async deleteCredential({ user_id, provider_id }: AiServiceDeleteCredential): Promise<void> {
    const credential = await this.prisma.userAiCredential.findUnique({
      where: { user_id_provider_id: { user_id, provider_id } },
    })

    if (!credential) throw new NotFoundException('Credential not found')

    const models = await this.prisma.aiModel.findMany({ where: { provider_id }, select: { id: true } })

    await this.prisma.$transaction(async tx => {
      await tx.userAiModelConfig.updateMany({
        where: { user_id, is_active: true, model_id: { in: models.map(model => model.id) } },
        data: { is_active: false, updated_at: new Date() },
      })

      await tx.userAiCredential.delete({ where: { id: credential.id } })
    })
  }

  async getActiveModel(user_id: number): Promise<AiActiveModelResult> {
    const config = await this.prisma.userAiModelConfig.findFirst({
      where: { user_id, is_active: true },
      include: { model: { include: { provider: true } } },
    })

    return { active_model: config ? this.toModelConfigResult(config) : null }
  }

  async activateModel({ user_id, model_id }: AiServiceActivateModel): Promise<AiModelConfigResult> {
    const model = await this.prisma.aiModel.findUnique({ where: { id: model_id } })
    if (!model || !model.is_active) throw new NotFoundException('AI model not found')

    const credential = await this.prisma.userAiCredential.findUnique({
      where: { user_id_provider_id: { user_id, provider_id: model.provider_id } },
    })

    if (!credential) throw new BadRequestException('Add the provider API key before activating one of its models')

    return this.prisma.$transaction(async tx => {
      await tx.userAiModelConfig.updateMany({
        where: { user_id, is_active: true },
        data: { is_active: false, updated_at: new Date() },
      })

      const config = await tx.userAiModelConfig.upsert({
        where: { user_id_model_id: { user_id, model_id } },
        create: { user_id, model_id, max_output_tokens: model.max_output_tokens, is_active: true },
        update: { is_active: true, updated_at: new Date() },
        include: { model: { include: { provider: true } } },
      })

      return this.toModelConfigResult(config)
    })
  }

  async deactivateModel(user_id: number): Promise<AiMessageResult> {
    const { count } = await this.prisma.userAiModelConfig.updateMany({
      where: { user_id, is_active: true },
      data: { is_active: false, updated_at: new Date() },
    })

    if (!count) throw new BadRequestException('No AI model is currently in use')
    return { message: 'AI model deactivated successfully.' }
  }

  async getModelConfig({ user_id, model_id }: AiServiceGetModelConfig): Promise<AiModelConfigResult> {
    const config = await this.prisma.userAiModelConfig.findUnique({
      where: { user_id_model_id: { user_id, model_id } },
      include: { model: { include: { provider: true } } },
    })
    if (!config) throw new NotFoundException('AI model config not found')

    return this.toModelConfigResult(config)
  }

  async updateModelConfig({ user_id, model_id, data }: AiServiceUpdateModelConfig): Promise<AiModelConfigResult> {
    const model = await this.prisma.aiModel.findUnique({ where: { id: model_id } })
    if (!model || !model.is_active) throw new NotFoundException('AI model not found')

    if (data.max_output_tokens != null && data.max_output_tokens > model.max_output_tokens) {
      throw new BadRequestException(`max_output_tokens must not exceed ${model.max_output_tokens} for ${model.name}`)
    }

    if (data.temperature != null && !model.supports_temperature) {
      throw new BadRequestException(`${model.name} does not accept the temperature parameter`)
    }

    const config = await this.prisma.userAiModelConfig.upsert({
      where: { user_id_model_id: { user_id, model_id } },
      create: { user_id, model_id, max_output_tokens: model.max_output_tokens, ...data },
      update: { ...data, updated_at: new Date() },
      include: { model: { include: { provider: true } } },
    })

    return this.toModelConfigResult(config)
  }

  private toCredentialResult(credential: CredentialWithProvider): AiCredentialResult {
    return {
      id: credential.id,
      provider_id: credential.provider_id,
      provider_slug: credential.provider.slug,
      provider_name: credential.provider.name,
      label: credential.label,
      masked_api_key: `****${credential.api_key_last_four}`,
      last_used_at: credential.last_used_at,
      created_at: credential.created_at,
      updated_at: credential.updated_at,
    }
  }

  private toModelConfigResult(config: ModelConfigWithRelations): AiModelConfigResult {
    return {
      id: config.id,
      model_id: config.model_id,
      model_slug: config.model.slug,
      model_name: config.model.name,
      provider_id: config.model.provider_id,
      provider_slug: config.model.provider.slug,
      max_output_tokens: config.max_output_tokens,
      temperature: config.temperature?.toNumber() ?? null,
      top_p: config.top_p?.toNumber() ?? null,
      frequency_penalty: config.frequency_penalty?.toNumber() ?? null,
      presence_penalty: config.presence_penalty?.toNumber() ?? null,
      system_prompt: config.system_prompt,
      is_active: config.is_active,
      created_at: config.created_at,
      updated_at: config.updated_at,
    }
  }
}
