import { Module } from '@nestjs/common'
import { SectionController } from './section.controller'
import { SectionService } from './services/section.service'
import { TokenModule } from 'src/shared/modules/token.module'
import { SectionFieldService } from './services/section-field.service'
import { SectionFieldOptionService } from './services/section-field-option.service'

@Module({
  imports: [TokenModule],
  providers: [SectionService, SectionFieldService, SectionFieldOptionService],
  controllers: [SectionController],
})
export class SectionModule {}
