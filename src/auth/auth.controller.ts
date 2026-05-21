import type { Response } from 'express'
import { AuthService } from './auth.service'
import { ConfigService } from '@nestjs/config'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from '../shared/decorators/zod-body.decorator'
import { getCookieOptions } from 'src/shared/utils/getCookieOptions'
import { type ClientInfoType } from 'src/shared/types/client-info.type'
import { ClientInfo } from 'src/shared/decorators/client-info.decorator'
import { authLoginSchema, type AuthLoginDto } from './dto/auth-login.dto'
import { type AuthLogoutDto, authLogoutSchema } from './dto/auth-logout.dto'
import { type AuthRefreshDto, authRefreshSchema } from './dto/auth-refresh.dto'
import { OAuthProviderRedirectGuard } from 'src/shared/guards/oauth-provider.guard'
import { createRegisterSchema, type CreateRegisterDto } from './dto/auth-register.dto'
import { Controller, Get, Injectable, Post, Query, Res, UseGuards } from '@nestjs/common'

@Injectable()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@ZodBody(authLogoutSchema) body: AuthLogoutDto) {
    const response = this.authService.logout(body.session_id)
    return response
  }

  @Get('github')
  async github(@Res() res: Response) {
    const cookieOptions = getCookieOptions()
    const { url, state } = this.authService.redirectToGithub()

    res.cookie('oauth_state', state, cookieOptions)
    res.redirect(url)
  }

  @Get('google')
  async google(@Res() res: Response) {
    const cookieOptions = getCookieOptions()
    const { url, state } = this.authService.redirectToGoogle()

    res.cookie('oauth_state', state, cookieOptions)
    res.redirect(url)
  }

  @Post('login')
  async login(@Res() res: Response, @ClientInfo() client: ClientInfoType, @ZodBody(authLoginSchema) body: AuthLoginDto) {
    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token, user } = await this.authService.login({ client, data: body })

    res.cookie('access_token', access_token, cookieOptions)
    res.cookie('refresh_token', refresh_token, cookieOptions)
    res.status(200).json({ session: { session_id }, user })
  }

  @Post('register')
  async register(@Res() res: Response, @ClientInfo() client: ClientInfoType, @ZodBody(createRegisterSchema) body: CreateRegisterDto) {
    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token, user } = await this.authService.register({ client, data: body })

    res.cookie('access_token', access_token, cookieOptions)
    res.cookie('refresh_token', refresh_token, cookieOptions)
    res.status(200).json({ session: { session_id }, user })
  }

  @Post('refresh')
  async refresh(@Res() res: Response, @ZodBody(authRefreshSchema) body: AuthRefreshDto) {
    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token } = await this.authService.refresh(body.session_id, body.refresh_token)

    res.cookie('access_token', access_token, cookieOptions)
    res.cookie('refresh_token', refresh_token, cookieOptions)
    res.status(200).json({ session: { session_id } })
  }

  @Get('github/callback')
  @UseGuards(OAuthProviderRedirectGuard)
  async githubCallback(@Res() res: Response, @Query('code') code: string, @ClientInfo() client: ClientInfoType) {
    const cookieOptions = getCookieOptions()
    const clientUrl = this.configService.get<string>('CLIENT_URL')
    const { session_id, access_token, refresh_token, user } = await this.authService.authenticateWithGithub({ code, client })

    res.cookie('access_token', access_token, cookieOptions)
    res.cookie('refresh_token', refresh_token, cookieOptions)

    res.cookie('session_info', JSON.stringify({ session_id, user }), getCookieOptions({ httpOnly: false }))
    res.redirect(`${clientUrl}`)
  }

  @Get('google/callback')
  @UseGuards(OAuthProviderRedirectGuard)
  async googleLogin(@Res() res: Response, @Query('code') code: string, @ClientInfo() client: ClientInfoType) {
    const cookieOptions = getCookieOptions()
    const clientUrl = this.configService.get<string>('CLIENT_URL')
    const { session_id, access_token, refresh_token, user } = await this.authService.authenticateWithGoogle({ client, code })

    res.cookie('access_token', access_token, cookieOptions)
    res.cookie('refresh_token', refresh_token, cookieOptions)

    res.cookie('session_info', JSON.stringify({ session_id, user }), getCookieOptions({ httpOnly: false }))
    res.redirect(`${clientUrl}`)
  }
}
