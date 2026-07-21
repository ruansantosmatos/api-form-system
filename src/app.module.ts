import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { FormModule } from './form/form.module'
import { FieldModule } from './field/field.module'
import { ImageModule } from './image/image.module'
import { R2Module } from './shared/modules/r2.module'
import { SectionModule } from './section/section.module'
import { MailModule } from './shared/modules/mail.module'
import { SecurityModule } from './shared/modules/security.module'
import { SubmissionModule } from './submission/submission.module'
import { PublicationModule } from './publication/publication.module'
import { PrismaClientModule } from './shared/modules/prisma-client.module'

@Module({
  controllers: [],
  imports: [
    AuthModule,
    FormModule,
    FieldModule,
    ImageModule,
    SectionModule,
    SubmissionModule,
    PublicationModule,
    SecurityModule,
    PrismaClientModule,
    MailModule,
    R2Module,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
