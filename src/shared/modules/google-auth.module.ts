import { Global, Module } from '@nestjs/common'
import { GoogleAuthService } from '../services/google-auth.service'

@Global()
@Module({
  providers: [GoogleAuthService],
  exports: [GoogleAuthService],
})
export class GoogleAuthModule {}
