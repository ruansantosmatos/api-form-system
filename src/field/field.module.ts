import { Module } from '@nestjs/common'
import { FieldController } from './field.controller'
import { TokenModule } from 'src/shared/modules/token.module'
import { FormFieldService } from './services/form-field.service'
import { FieldOptionService } from './services/field-option.service'
import { FieldCatalogService } from './services/field-catalog.service'

@Module({
  imports: [TokenModule],
  controllers: [FieldController],
  providers: [FormFieldService, FieldOptionService, FieldCatalogService],
})
export class FieldModule {}
