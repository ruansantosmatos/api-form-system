import { TotpService } from './totp.service'
import { SecurityService } from './security.service'
import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaClientService } from './prisma-client.service'
import { TwoFactorServiceVerify } from '../types/two-factor-service.type'

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly totpService: TotpService,
    private readonly securityService: SecurityService,
  ) {}

  async verifyCode({ user_id, code }: TwoFactorServiceVerify): Promise<void> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({ where: { user_id } })
    if (!twoFactorAuth?.is_enabled) throw new BadRequestException('Two-factor authentication is not enabled.')

    const secret = this.totpService.decrypt(twoFactorAuth.secret)
    const isValidTotp = await this.totpService.verifyToken(secret, code)

    if (isValidTotp) return

    const backupCodes = await this.prisma.twoFactorBackupCode.findMany({
      where: { two_factor_id: twoFactorAuth.id, used_at: null },
    })

    for (const backupCode of backupCodes) {
      const isMatch = await this.securityService.compare(code, backupCode.code_hash)
      if (isMatch) {
        await this.prisma.twoFactorBackupCode.update({ where: { id: backupCode.id }, data: { used_at: new Date() } })
        return
      }
    }

    throw new BadRequestException('Invalid or expired code.')
  }
}
