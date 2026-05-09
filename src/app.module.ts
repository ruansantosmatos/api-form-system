import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { FormModule } from './form/form.module'
import { FieldModule } from './field/field.module'
import { SectionModule } from './section/section.module'
import { SecurityModule } from './shared/modules/security.module'
import { PrismaClientModule } from './shared/modules/prisma-client.module'

@Module({
  controllers: [],
  imports: [
    AuthModule,
    FormModule,
    FieldModule,
    SectionModule,
    SecurityModule, 
    PrismaClientModule, 
    ConfigModule.forRoot({ isGlobal: true }), 
  ],
})
export class AppModule {}
