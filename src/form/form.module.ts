import { Module } from '@nestjs/common'
import { AiModule } from 'src/ai/ai.module'
import { FormService } from './form.service'
import { FormController } from './form.controller'
import { TokenModule } from 'src/shared/modules/token.module'
import { FormGenerationService } from './form-generation.service'
import { SubmissionModule } from 'src/submission/submission.module'

@Module({
  imports: [TokenModule, SubmissionModule, AiModule],
  providers: [FormService, FormGenerationService],
  controllers: [FormController],
})
export class FormModule {}
