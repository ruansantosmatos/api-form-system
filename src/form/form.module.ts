import { Module } from '@nestjs/common'
import { FormController } from './form.controller'
import { FormService } from './services/form.service'
import { TokenModule } from 'src/shared/modules/token.module'
import { FormConfigService } from './services/form-config.service'
import { SubmissionModule } from 'src/submission/submission.module'

@Module({
  imports: [TokenModule, SubmissionModule],
  providers: [FormService, FormConfigService],
  controllers: [FormController],
})
export class FormModule {}
