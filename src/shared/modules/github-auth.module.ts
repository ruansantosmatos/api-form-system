import { Global, Module } from '@nestjs/common'
import { GithubAuthService } from '../services/github-auth.service'

@Global()
@Module({
  exports: [GithubAuthService],
  providers: [GithubAuthService],
})
export class GithubAuthModule {}
