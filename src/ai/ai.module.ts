import { Module } from '@nestjs/common'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'
import { TokenModule } from 'src/shared/modules/token.module'

@Module({
  imports: [TokenModule],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
