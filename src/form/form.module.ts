import { Module } from '@nestjs/common'
import { FormService } from './form.service'
import { FormController } from './form.controller'
import { TokenModule } from 'src/shared/modules/token.module'
import { SubmissionModule } from 'src/submission/submission.module'

@Module({
  imports: [TokenModule, SubmissionModule],
  providers: [FormService],
  controllers: [FormController],
})
export class FormModule {}
