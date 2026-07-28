import { ConfigService } from '@nestjs/config'
import { OtpService } from 'src/shared/services/otp.service'
import { TotpService } from 'src/shared/services/totp.service'
import { MailService } from 'src/shared/services/mail.service'
import { TOKENS_EXPIRES } from 'src/shared/consts/tokens-expires'
import { TwoFactorService } from 'src/shared/services/two-factor.service'
import { VERIFICATION_PURPOSE } from 'src/shared/consts/verification-purpose'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  AccountSettingsResult,
  AccountMessageResult,
  AccountServiceUpdateRecoveryEmail,
  AccountServiceVerifyRecoveryEmail,
  AccountTwoFactorSetupResult,
  AccountServiceConfirmTwoFactor,
  AccountTwoFactorConfirmResult,
  AccountServiceDisableTwoFactor,
} from './interface/account.interface'

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly mailService: MailService,
    private readonly otpService: OtpService,
    private readonly totpService: TotpService,
    private readonly configService: ConfigService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async getSettings(user_id: number): Promise<AccountSettingsResult> {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } })
    if (!user) throw new NotFoundException('User not found.')

    const accountSettings = await this.prisma.accountSettings.findUnique({ where: { user_id } })
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({ where: { user_id } })

    return {
      email: user.email,
      recovery_email: accountSettings?.recovery_email ?? null,
      recovery_email_verified: Boolean(accountSettings?.recovery_email_verified_at),
      recovery_email_pending: accountSettings?.recovery_email_pending ?? null,
      is_2fa_enabled: Boolean(twoFactorAuth?.is_enabled),
    }
  }

  async updateRecoveryEmail({ user_id, recovery_email }: AccountServiceUpdateRecoveryEmail): Promise<AccountMessageResult> {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } })
    if (!user) throw new NotFoundException('User not found.')

    if (recovery_email === user.email) throw new BadRequestException('Recovery email must be different from your account email.')

    await this.prisma.accountSettings.upsert({
      where: { user_id },
      create: { user_id, recovery_email_pending: recovery_email },
      update: { recovery_email_pending: recovery_email, updated_at: new Date() },
    })

    const code = await this.otpService.create({
      user_id,
      purpose: VERIFICATION_PURPOSE.RECOVERY_EMAIL_VERIFY,
      expires_in_ms: TOKENS_EXPIRES.RECOVERY_EMAIL_VERIFY,
    })

    const expiresInMinutes = TOKENS_EXPIRES.RECOVERY_EMAIL_VERIFY / (60 * 1000)

    await this.mailService.send({
      to: recovery_email,
      subject: 'Confirme seu email de recuperação',
      template: {
        id: 'recovery-email-verification-1',
        variables: {
          user_name: user.name,
          otp_code: code,
          app_name: this.configService.get<string>('APP_NAME', 'FormSystem'),
          expires_in: `${expiresInMinutes} minuto${expiresInMinutes === 1 ? '' : 's'}`,
        },
      },
    })

    return { message: 'Verification code sent to the new recovery email.' }
  }

  async verifyRecoveryEmail({ user_id, code }: AccountServiceVerifyRecoveryEmail): Promise<AccountMessageResult> {
    const accountSettings = await this.prisma.accountSettings.findUnique({ where: { user_id } })
    if (!accountSettings?.recovery_email_pending) throw new BadRequestException('No pending recovery email change.')

    await this.otpService.verify({ user_id, purpose: VERIFICATION_PURPOSE.RECOVERY_EMAIL_VERIFY, code })

    await this.prisma.accountSettings.update({
      where: { user_id },
      data: {
        recovery_email: accountSettings.recovery_email_pending,
        recovery_email_pending: null,
        recovery_email_verified_at: new Date(),
      },
    })

    return { message: 'Recovery email verified successfully.' }
  }

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
