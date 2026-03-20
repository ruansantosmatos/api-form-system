import { Global, Module } from '@nestjs/common'
import { PrismaClientModule } from './prisma-client.module'
import { GoogleAuthService } from '../services/google-auth.service'

@Global()
@Module({
  exports: [GoogleAuthService],
  providers: [GoogleAuthService],
  imports: [PrismaClientModule],
})
export class GoogleAuthModule {}
