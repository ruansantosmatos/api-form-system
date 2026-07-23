import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { FormModule } from './form/form.module'
import { FieldModule } from './field/field.module'
import { ImageModule } from './image/image.module'
import { AccountModule } from './account/account.module'
import { R2Module } from './shared/modules/r2.module'
import { SectionModule } from './section/section.module'
import { MailModule } from './shared/modules/mail.module'
import { SecurityModule } from './shared/modules/security.module'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { SubmissionModule } from './submission/submission.module'
import { PublicationModule } from './publication/publication.module'
import { PrismaClientModule } from './shared/modules/prisma-client.module'

@Module({
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  imports: [
    AuthModule,
    FormModule,
    FieldModule,
    ImageModule,
    AccountModule,
    SectionModule,
    SubmissionModule,
    PublicationModule,
    SecurityModule,
    PrismaClientModule,
    MailModule,
    R2Module,
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60 * 1000, limit: 10 }]),
  ],
})
export class AppModule {}
