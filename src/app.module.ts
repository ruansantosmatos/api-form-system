import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { SecurityModule } from './shared/modules/security.module'
import { PrismaClientModule } from './shared/modules/prisma-client.module'

@Module({
  controllers: [],
  imports: [SecurityModule, PrismaClientModule, ConfigModule.forRoot({ isGlobal: true }), AuthModule],
})
export class AppModule {}
