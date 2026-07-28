import { Module } from '@nestjs/common'
import { AiModule } from 'src/ai/ai.module'
import { FormController } from './form.controller'
import { FormService } from './services/form.service'
import { TokenModule } from 'src/shared/modules/token.module'
import { FormConfigService } from './services/form-config.service'
import { SubmissionModule } from 'src/submission/submission.module'
import { FormGenerationService } from './services/form-generation.service'

@Module({
  imports: [TokenModule, SubmissionModule, AiModule],
  providers: [FormService, FormConfigService, FormGenerationService],
  controllers: [FormController],
})
export class FormModule {}
