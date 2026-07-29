import { Module } from '@nestjs/common'
import { PublicationController } from './publication.controller'
import { TokenModule } from 'src/shared/modules/token.module'
import { PublicFormService } from './services/public-form.service'
import { PublicationService } from './services/publication.service'

@Module({
  imports: [TokenModule],
  providers: [PublicationService, PublicFormService],
  controllers: [PublicationController],
})
export class PublicationModule {}
