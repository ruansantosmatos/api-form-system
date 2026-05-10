import { Module } from '@nestjs/common'
import { SectionService } from './section.service'
import { SectionController } from './section.controller'
import { TokenModule } from 'src/shared/modules/token.module'

@Module({
  imports: [TokenModule],
  providers: [SectionService],
  controllers: [SectionController],
})
export class SectionModule {}
