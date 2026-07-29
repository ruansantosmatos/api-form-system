import { Injectable } from '@nestjs/common'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'

@Injectable()
export class AiAccessService {
  constructor(private readonly prisma: PrismaClientService) {}

  async syncAccess(user_id: number): Promise<void> {
    const activeCount = await this.prisma.userAiModelConfig.count({ where: { user_id, is_active: true } })
    const has_ai_access = activeCount > 0

    await this.prisma.accountSettings.upsert({
      where: { user_id },
      create: { user_id, has_ai_access },
      update: { has_ai_access, updated_at: new Date() },
    })
  }
}
