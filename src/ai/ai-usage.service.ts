import { Injectable } from '@nestjs/common'
import { AI_USAGE_STATUS } from 'src/shared/consts/ai-usage-status'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import type { AiUsageLogErrorInput, AiUsageLogSuccessInput } from './interface/ai-generation.interface'

@Injectable()
export class AiUsageService {
  constructor(private readonly prisma: PrismaClientService) {}

  async logSuccess({
    user_id,
    provider_id,
    model_id,
    input_tokens,
    output_tokens,
    input_cost_per_million,
    output_cost_per_million,
  }: AiUsageLogSuccessInput): Promise<void> {
    const estimated_cost = this.estimateCost({ input_tokens, output_tokens, input_cost_per_million, output_cost_per_million })

    await this.prisma.aiUsageLog.create({
      data: { user_id, provider_id, model_id, input_tokens, output_tokens, estimated_cost, status: AI_USAGE_STATUS.SUCCESS },
    })
  }

  async logError({ user_id, provider_id, model_id, error_message }: AiUsageLogErrorInput): Promise<void> {
    await this.prisma.aiUsageLog.create({
      data: { user_id, provider_id, model_id, input_tokens: 0, output_tokens: 0, estimated_cost: 0, status: AI_USAGE_STATUS.ERROR, error_message },
    })
  }

  private estimateCost({
    input_tokens,
    output_tokens,
    input_cost_per_million,
    output_cost_per_million,
  }: Pick<AiUsageLogSuccessInput, 'input_tokens' | 'output_tokens' | 'input_cost_per_million' | 'output_cost_per_million'>): number {
    return (input_tokens / 1_000_000) * input_cost_per_million + (output_tokens / 1_000_000) * output_cost_per_million
  }
}
