import { Module } from '@nestjs/common'
import { OtpModule } from 'src/shared/modules/otp.module'
import { TokenModule } from 'src/shared/modules/token.module'
import { AccountController } from './account.controller'
import { AccountService } from './services/account.service'
import { TwoFactorModule } from 'src/shared/modules/two-factor.module'
import { AccountTwoFactorService } from './services/account-two-factor.service'

@Module({
  imports: [TokenModule, OtpModule, TwoFactorModule],
  providers: [AccountService, AccountTwoFactorService],
  controllers: [AccountController],
})
export class AccountModule {}
