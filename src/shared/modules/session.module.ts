import { Module } from '@nestjs/common'
import { SessionService } from '../services/session.service'
import { TokenModule } from './token.module'

@Module({
  providers: [SessionService],
  exports: [SessionService],
  imports: [TokenModule],
})
export class SessionModule {}
