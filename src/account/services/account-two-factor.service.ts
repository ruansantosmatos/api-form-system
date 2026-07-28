import { TotpService } from 'src/shared/services/totp.service'
import { TwoFactorService } from 'src/shared/services/two-factor.service'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  AccountMessageResult,
  AccountTwoFactorSetupResult,
  AccountServiceConfirmTwoFactor,
  AccountTwoFactorConfirmResult,
  AccountServiceDisableTwoFactor,
} from '../interface/account.interface'

@Injectable()
export class AccountTwoFactorService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly totpService: TotpService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async setupTwoFactor(user_id: number): Promise<AccountTwoFactorSetupResult> {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } })
    if (!user) throw new NotFoundException('User not found.')

    const secret = this.totpService.generateSecret()
    const otpauth_url = this.totpService.buildOtpAuthUrl(secret, user.email)
    const qr_code_data_uri = await this.totpService.buildQrCodeDataUri(otpauth_url)

    await this.prisma.twoFactorAuth.upsert({
      where: { user_id },
      create: { user_id, secret: this.totpService.encrypt(secret), is_enabled: false },
      update: { secret: this.totpService.encrypt(secret), is_enabled: false, confirmed_at: null, updated_at: new Date() },
    })

    return { secret, otpauth_url, qr_code_data_uri }
  }

  async confirmTwoFactor({ user_id, code }: AccountServiceConfirmTwoFactor): Promise<AccountTwoFactorConfirmResult> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({ where: { user_id } })
    if (!twoFactorAuth) throw new BadRequestException('Two-factor setup not started.')

    const secret = this.totpService.decrypt(twoFactorAuth.secret)
    const isValid = await this.totpService.verifyToken(secret, code)
    if (!isValid) throw new BadRequestException('Invalid or expired code.')

    const { codes, hashes } = await this.totpService.generateBackupCodes()
    await this.prisma.twoFactorBackupCode.deleteMany({ where: { two_factor_id: twoFactorAuth.id } })

    await this.prisma.twoFactorBackupCode.createMany({
      data: hashes.map(code_hash => ({ two_factor_id: twoFactorAuth.id, code_hash })),
    })

    await this.prisma.twoFactorAuth.update({
      where: { id: twoFactorAuth.id },
      data: { is_enabled: true, confirmed_at: new Date() },
    })

    return { message: 'Two-factor authentication enabled successfully.', backup_codes: codes }
  }

  async disableTwoFactor({ user_id, code }: AccountServiceDisableTwoFactor): Promise<AccountMessageResult> {
    await this.twoFactorService.verifyCode({ user_id, code })

    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({ where: { user_id } })
    if (!twoFactorAuth) throw new BadRequestException('Two-factor authentication is not enabled.')

    await this.prisma.twoFactorBackupCode.deleteMany({ where: { two_factor_id: twoFactorAuth.id } })
    await this.prisma.twoFactorAuth.delete({ where: { id: twoFactorAuth.id } })

    return { message: 'Two-factor authentication disabled successfully.' }
  }
}
