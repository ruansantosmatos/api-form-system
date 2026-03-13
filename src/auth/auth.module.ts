import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { TokenModule } from '../shared/modules/token.module'
import { SessionModule } from 'src/shared/modules/session.module'

@Module({
  exports: [AuthService],
  providers: [AuthService],
  controllers: [AuthController],
  imports: [TokenModule, SessionModule],
})
export class AuthModule {}
