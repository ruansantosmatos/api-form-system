import { Module } from '@nestjs/common'
import { SubmissionController } from './submission.controller'
import { TokenModule } from 'src/shared/modules/token.module'
import { SubmissionService } from './services/submission.service'
import { SubmissionQueryService } from './services/submission-query.service'
import { SubmissionExportService } from './services/submission-export.service'

@Module({
  imports: [TokenModule],
  controllers: [SubmissionController],
  providers: [SubmissionService, SubmissionQueryService, SubmissionExportService],
  exports: [SubmissionService, SubmissionQueryService, SubmissionExportService],
})
export class SubmissionModule {}
