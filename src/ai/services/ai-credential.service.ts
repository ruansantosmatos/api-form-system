import { AiAccessService } from './ai-access.service'
import { CryptoService } from 'src/shared/services/crypto.service'
import { AI_API_KEY_PATTERN } from 'src/shared/consts/ai-provider'
import { toCredentialResult } from '../mappers/ai-result.mapper'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { AiCredentialResult, AiServiceDeleteCredential, AiServiceUpsertCredential } from '../interface/ai.interface'

@Injectable()
export class AiCredentialService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly cryptoService: CryptoService,
    private readonly aiAccessService: AiAccessService,
  ) {}

  async getCredentials(user_id: number): Promise<AiCredentialResult[]> {
    const credentials = await this.prisma.userAiCredential.findMany({
      where: { user_id },
      orderBy: { provider: { name: 'asc' } },
      include: { provider: true },
    })

    return credentials.map(credential => toCredentialResult(credential))
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

    return toCredentialResult(credential)
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

    await this.aiAccessService.syncAccess(user_id)
  }
}
