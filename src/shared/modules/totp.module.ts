import { Module } from '@nestjs/common'
import { TotpService } from '../services/totp.service'

@Module({
  providers: [TotpService],
  exports: [TotpService],
})
export class TotpModule {}
