import { Module } from '@nestjs/common'
import { PublicationService } from './publication.service'
import { PublicationController } from './publication.controller'
import { TokenModule } from 'src/shared/modules/token.module'

@Module({
  imports: [TokenModule],
  providers: [PublicationService],
  controllers: [PublicationController],
})
export class PublicationModule {}
