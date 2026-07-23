import { randomInt, createHash } from 'crypto'
import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaClientService } from './prisma-client.service'
import { VERIFICATION_CODE_MAX_ATTEMPTS } from '../consts/tokens-expires'
import { OtpServiceCreate, OtpServiceVerify } from '../types/otp-service.type'

@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaClientService) { }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex')
  }

  async create({ user_id, purpose, expires_in_ms }: OtpServiceCreate): Promise<string> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const code_hash = this.hash(code)
    const expires_at = new Date(Date.now() + expires_in_ms)

    await this.prisma.verificationCode.updateMany({
      where: { user_id, purpose, used_at: null },
      data: { used_at: new Date() },
    })

    await this.prisma.verificationCode.create({ data: { user_id, purpose, code_hash, expires_at } })
    return code
  }

  async verify({ user_id, purpose, code }: OtpServiceVerify): Promise<void> {
    const now = new Date()
    
    const verificationCode = await this.prisma.verificationCode.findFirst({
      where: { user_id, purpose, used_at: null },
      orderBy: { created_at: 'desc' },
    })

    if (!verificationCode || verificationCode.expires_at < now) throw new BadRequestException('Invalid or expired code.')

    if (verificationCode.attempts >= VERIFICATION_CODE_MAX_ATTEMPTS) throw new BadRequestException('Too many attempts. Request a new code.')

    const isValid = this.hash(code) === verificationCode.code_hash

    if (!isValid) {
      await this.prisma.verificationCode.update({ where: { id: verificationCode.id }, data: { attempts: { increment: 1 } } })
      throw new BadRequestException('Invalid or expired code.')
    }

    await this.prisma.verificationCode.update({ where: { id: verificationCode.id }, data: { used_at: now } })
  }
}
