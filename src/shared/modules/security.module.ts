import { Global, Module } from '@nestjs/common'
import { SecurityService } from '../services/security.service'

@Global()
@Module({
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
