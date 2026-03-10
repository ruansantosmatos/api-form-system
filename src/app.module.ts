import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './shared/modules/prisma-client.module'
import { SecurityModule } from './shared/modules/security.module'

@Module({
  imports: [AuthModule, PrismaModule, SecurityModule, ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
