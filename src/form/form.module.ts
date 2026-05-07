import { Module } from '@nestjs/common'
import { FormService } from './form.service'
import { FormController } from './form.controller'
import { TokenModule } from 'src/shared/modules/token.module'

@Module({
  imports: [TokenModule],
  providers: [FormService],
  controllers: [FormController],
})
export class FormModule {}
