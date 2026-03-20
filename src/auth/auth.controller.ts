import { AuthService } from './auth.service'
import { ZodBody } from '../shared/decorators/zod-body.decorator'
import { GoogleAuthGuard } from 'src/shared/guards/google-auth.guard'
import { type ClientInfoType } from 'src/shared/types/client-info.type'
import { ClientInfo } from 'src/shared/decorators/client-info.decorator'
import { type AuthLogoutDto, authLogoutSchema } from './dto/auth-logout.dto'
import { Body, Controller, Injectable, Post, UseGuards } from '@nestjs/common'
import { type AuthRefreshDto, authRefreshSchema } from './dto/auth-refresh.dto'
import { type AuthGoogleLoginDto, authLoginSchema, type AuthLoginDto } from './dto/auth-login.dto'
import { type CreateRegisterGoogleDto, createRegisterSchema, type CreateRegisterDto } from './dto/auth-register.dto'

@Injectable()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('logout')
  logout(@ZodBody(authLogoutSchema) body: AuthLogoutDto) {
    const response = this.authService.logout(body.session_id)
    return response
  }

  @Post('login')
  async login(@ClientInfo() client: ClientInfoType, @ZodBody(authLoginSchema) body: AuthLoginDto) {
    const session = await this.authService.signIn({ client, data: body })
    return session
  }

  @Post('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin(@ClientInfo() client: ClientInfoType, @Body() body: AuthGoogleLoginDto) {
    const credential = body.credential
    const session = await this.authService.signInGoogle({ client, credential })
    return session
  }

  @Post('register/google')
  @UseGuards(GoogleAuthGuard)
  async googleRegister(@ClientInfo() client: ClientInfoType, @Body() body: CreateRegisterGoogleDto) {
    const credential = body.credential
    const session = await this.authService.signUpGoogle({ client, credential })
    return session
  }

  @Post('register')
  async register(@ClientInfo() client: ClientInfoType, @ZodBody(createRegisterSchema) body: CreateRegisterDto) {
    const session = await this.authService.signUp({ client, data: body })
    return session
  }

  @Post('refresh')
  refresh(@ZodBody(authRefreshSchema) body: AuthRefreshDto) {
    const refreshSession = this.authService.refresh(body.session_id, body.refresh_token)
    return refreshSession
  }
}
