import { Global, Module } from '@nestjs/common'
import { MailService } from '../services/mail.service'

@Global()
@Module({
  exports: [MailService],
  providers: [MailService],
})
export class MailModule {}
