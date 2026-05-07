import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TokenService } from '../services/token.service'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'

@Module({
  imports: [JwtModule],
  providers: [TokenService, JwtAuthGuard],
  exports: [TokenService, JwtAuthGuard, JwtModule],
})
export class TokenModule {}
