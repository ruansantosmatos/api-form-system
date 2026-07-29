import { AiAccessService } from './ai-access.service'
import { toModelConfigResult } from '../mappers/ai-result.mapper'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  AiActiveModelResult,
  AiMessageResult,
  AiModelConfigResult,
  AiServiceActivateModel,
  AiServiceGetModelConfig,
  AiServiceUpdateModelConfig,
} from '../interface/ai.interface'

@Injectable()
export class AiModelConfigService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly aiAccessService: AiAccessService,
  ) {}

  async getActiveModel(user_id: number): Promise<AiActiveModelResult> {
    const config = await this.prisma.userAiModelConfig.findFirst({
      where: { user_id, is_active: true },
      include: { model: { include: { provider: true } } },
    })

    return { active_model: config ? toModelConfigResult(config) : null }
  }

  async activateModel({ user_id, model_id }: AiServiceActivateModel): Promise<AiModelConfigResult> {
    const model = await this.prisma.aiModel.findUnique({ where: { id: model_id } })
    if (!model || !model.is_active) throw new NotFoundException('AI model not found')

    const credential = await this.prisma.userAiCredential.findUnique({
      where: { user_id_provider_id: { user_id, provider_id: model.provider_id } },
    })

    if (!credential) throw new BadRequestException('Add the provider API key before activating one of its models')

    const config = await this.prisma.$transaction(async tx => {
      await tx.userAiModelConfig.updateMany({
        where: { user_id, is_active: true },
        data: { is_active: false, updated_at: new Date() },
      })

      return tx.userAiModelConfig.upsert({
        where: { user_id_model_id: { user_id, model_id } },
        create: { user_id, model_id, max_output_tokens: model.max_output_tokens, is_active: true },
        update: { is_active: true, updated_at: new Date() },
        include: { model: { include: { provider: true } } },
      })
    })

    await this.aiAccessService.syncAccess(user_id)

    return toModelConfigResult(config)
  }

  async deactivateModel(user_id: number): Promise<AiMessageResult> {
    const { count } = await this.prisma.userAiModelConfig.updateMany({
      where: { user_id, is_active: true },
      data: { is_active: false, updated_at: new Date() },
    })

    if (!count) throw new BadRequestException('No AI model is currently in use')

    await this.aiAccessService.syncAccess(user_id)

    return { message: 'AI model deactivated successfully.' }
  }

  async getModelConfig({ user_id, model_id }: AiServiceGetModelConfig): Promise<AiModelConfigResult> {
    const config = await this.prisma.userAiModelConfig.findUnique({
      where: { user_id_model_id: { user_id, model_id } },
      include: { model: { include: { provider: true } } },
    })

    if (!config) throw new NotFoundException('AI model config not found')
    return toModelConfigResult(config)
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

    return toModelConfigResult(config)
  }
}
