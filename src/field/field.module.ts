import { Module } from '@nestjs/common'
import { FieldService } from './field.service'
import { FieldController } from './field.controller'
import { TokenModule } from 'src/shared/modules/token.module'

@Module({
  imports: [TokenModule],
  providers: [FieldService],
  controllers: [FieldController],
})
export class FieldModule {}
