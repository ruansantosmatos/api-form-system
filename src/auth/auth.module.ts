import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { TokenModule } from '../shared/modules/token.module'
import { SessionModule } from 'src/shared/modules/session.module'
import { TwoFactorModule } from 'src/shared/modules/two-factor.module'
import { GoogleAuthModule } from 'src/shared/modules/google-auth.module'
import { GithubAuthModule } from 'src/shared/modules/github-auth.module'

@Module({
  exports: [AuthService],
  providers: [AuthService],
  controllers: [AuthController],
  imports: [TokenModule, TwoFactorModule, SessionModule, GithubAuthModule, GoogleAuthModule],
})
export class AuthModule {}
