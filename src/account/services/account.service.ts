import { ConfigService } from '@nestjs/config'
import { OtpService } from 'src/shared/services/otp.service'
import { MailService } from 'src/shared/services/mail.service'
import { TOKENS_EXPIRES } from 'src/shared/consts/tokens-expires'
import { VERIFICATION_PURPOSE } from 'src/shared/consts/verification-purpose'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import {
  AccountSettingsResult,
  AccountMessageResult,
  AccountServiceUpdateRecoveryEmail,
  AccountServiceVerifyRecoveryEmail,
} from '../interface/account.interface'

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly mailService: MailService,
    private readonly otpService: OtpService,
    private readonly configService: ConfigService,
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
      has_ai_access: Boolean(accountSettings?.has_ai_access),
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
}
