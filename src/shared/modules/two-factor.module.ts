import { Module } from '@nestjs/common'
import { TotpModule } from './totp.module'
import { TwoFactorService } from '../services/two-factor.service'

@Module({
  imports: [TotpModule],
  providers: [TwoFactorService],
  exports: [TwoFactorService, TotpModule],
})
export class TwoFactorModule {}
