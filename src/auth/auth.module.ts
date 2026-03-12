import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { TokenModule } from '../shared/modules/token.module'

@Module({
  exports: [AuthService],
  imports: [TokenModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
