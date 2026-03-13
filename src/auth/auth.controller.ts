import { AuthService } from './auth.service'
import { ZodBody } from '../shared/decorators/zod-body.decorator'
import { UserAgent } from 'src/shared/decorators/user-agent.decorator'
import { SessionId } from 'src/shared/decorators/session-id.decorator'
import { authLoginSchema, type AuthLoginDto } from './dto/auth-login.dto'
import { SessionHeaderGuard } from 'src/shared/guards/session-header.guard'
import { Controller, Injectable, Ip, Post, UseGuards } from '@nestjs/common'
import { type AuthRefreshDto, authRefreshSchema } from './dto/auth-refresh.dto'
import { createRegisterSchema, type CreateRegisterDto } from './dto/create-register.dto'

@Injectable()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Ip() ip: string, @UserAgent() userAgent: string, @ZodBody(authLoginSchema) body: AuthLoginDto) {
    const session = await this.authService.signIn(ip, userAgent, body)
    return session
  }

  @Post('register')
  async register(@Ip() ip: string, @UserAgent() userAgent: string, @ZodBody(createRegisterSchema) body: CreateRegisterDto) {
    const session = await this.authService.signUp(ip, userAgent, body)
    return session
  }

  @Post('refresh')
  @UseGuards(SessionHeaderGuard)
  refresh(@SessionId() sessionId: number, @ZodBody(authRefreshSchema) body: AuthRefreshDto) {
    const refreshSession = this.authService.refresh(sessionId, body.refresh_token)
    return refreshSession
  }
}
