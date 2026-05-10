import { Module } from '@nestjs/common'
import { SubmissionService } from './submission.service'
import { SubmissionController } from './submission.controller'
import { TokenModule } from 'src/shared/modules/token.module'

@Module({
  imports: [TokenModule],
  providers: [SubmissionService],
  controllers: [SubmissionController],
})
export class SubmissionModule {}
