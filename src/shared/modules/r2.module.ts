import { Global, Module } from '@nestjs/common'
import { R2Service } from '../services/r2.service'

@Global()
@Module({
  exports: [R2Service],
  providers: [R2Service],
})
export class R2Module {}
