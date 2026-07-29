import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { TokenModule } from '../shared/modules/token.module'
import { AuthOAuthService } from './services/auth-oauth.service'
import { SessionModule } from 'src/shared/modules/session.module'
import { AuthSessionService } from './services/auth-session.service'
import { AuthPasswordService } from './services/auth-password.service'
import { TwoFactorModule } from 'src/shared/modules/two-factor.module'
import { GoogleAuthModule } from 'src/shared/modules/google-auth.module'
import { GithubAuthModule } from 'src/shared/modules/github-auth.module'

@Module({
  controllers: [AuthController],
  exports: [AuthOAuthService, AuthSessionService, AuthPasswordService],
  providers: [AuthOAuthService, AuthSessionService, AuthPasswordService],
  imports: [TokenModule, TwoFactorModule, SessionModule, GithubAuthModule, GoogleAuthModule],
})
export class AuthModule {}
