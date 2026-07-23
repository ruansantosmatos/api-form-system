import { Module } from '@nestjs/common'
import { AccountService } from './account.service'
import { OtpModule } from 'src/shared/modules/otp.module'
import { TokenModule } from 'src/shared/modules/token.module'
import { AccountController } from './account.controller'
import { TwoFactorModule } from 'src/shared/modules/two-factor.module'

@Module({
  imports: [TokenModule, OtpModule, TwoFactorModule],
  providers: [AccountService],
  controllers: [AccountController],
})
export class AccountModule {}
