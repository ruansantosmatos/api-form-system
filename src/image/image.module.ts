import { Module } from '@nestjs/common'
import { ImageController } from './image.controller'
import { TokenModule } from 'src/shared/modules/token.module'
import { FieldImageService } from './services/field-image.service'
import { SectionImageService } from './services/section-image.service'

@Module({
  imports: [TokenModule],
  controllers: [ImageController],
  providers: [FieldImageService, SectionImageService],
})
export class ImageModule {}
