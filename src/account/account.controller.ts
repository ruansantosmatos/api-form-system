import { AccountService } from './account.service'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { verifyCodeSchema, type VerifyCodeDto } from './dto/verify-code.dto'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { CurrentUser } from 'src/shared/decorators/current-user.decorator'
import { updateRecoveryEmailSchema, type UpdateRecoveryEmailDto } from './dto/update-recovery-email.dto'
import { Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings(@CurrentUser() user_id: number) {
    return this.accountService.getSettings(user_id)
  }

  @Patch('recovery-email')
  @UseGuards(JwtAuthGuard)
  async updateRecoveryEmail(@CurrentUser() user_id: number, @ZodBody(updateRecoveryEmailSchema) body: UpdateRecoveryEmailDto) {
    return this.accountService.updateRecoveryEmail({ user_id, recovery_email: body.recovery_email })
  }

  @Post('recovery-email/verify')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  async verifyRecoveryEmail(@CurrentUser() user_id: number, @ZodBody(verifyCodeSchema) body: VerifyCodeDto) {
    return this.accountService.verifyRecoveryEmail({ user_id, code: body.code })
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  async setupTwoFactor(@CurrentUser() user_id: number) {
    return this.accountService.setupTwoFactor(user_id)
  }

  @Post('2fa/confirm')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  async confirmTwoFactor(@CurrentUser() user_id: number, @ZodBody(verifyCodeSchema) body: VerifyCodeDto) {
    return this.accountService.confirmTwoFactor({ user_id, code: body.code })
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  async disableTwoFactor(@CurrentUser() user_id: number, @ZodBody(verifyCodeSchema) body: VerifyCodeDto) {
    return this.accountService.disableTwoFactor({ user_id, code: body.code })
  }
}
