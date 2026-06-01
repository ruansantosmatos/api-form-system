import type { Response } from 'express'
import { AuthService } from './auth.service'
import { ConfigService } from '@nestjs/config'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from '../shared/decorators/zod-body.decorator'
import { TOKENS_EXPIRES } from 'src/shared/consts/tokens-expires'
import { getCookieOptions } from 'src/shared/utils/getCookieOptions'
import { type ClientInfoType } from 'src/shared/types/client-info.type'
import { ClientInfo } from 'src/shared/decorators/client-info.decorator'
import { authLoginSchema, type AuthLoginDto } from './dto/auth-login.dto'
import { CurrentUser } from 'src/shared/decorators/current-user.decorator'
import { type AuthLogoutDto, authLogoutSchema } from './dto/auth-logout.dto'
import { type AuthRefreshDto, authRefreshSchema } from './dto/auth-refresh.dto'
import { OAuthProviderRedirectGuard } from 'src/shared/guards/oauth-provider.guard'
import { createRegisterSchema, type CreateRegisterDto } from './dto/auth-register.dto'
import { Controller, Get, Injectable, Post, Query, Req, Res, UseGuards } from '@nestjs/common'

@Injectable()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@ZodBody(authLogoutSchema) body: AuthLogoutDto, @CurrentUser() user_id: number) {
    return this.authService.logout({ session_id: body.session_id, user_id })
  }

  @Get('github')
  async github(@Res() res: Response, @Query('error_redirect') errorRedirect?: string, @Query('remember_me') rememberMe?: string) {
    const cookieOptions = getCookieOptions()
    const { url, state } = this.authService.redirectToGithub()

    res.cookie('oauth_state', state, cookieOptions)
    if (errorRedirect?.startsWith('/')) res.cookie('oauth_error_redirect', errorRedirect, cookieOptions)

    if (rememberMe === 'true') res.cookie('oauth_remember_me', 'true', cookieOptions)
    res.redirect(url)
  }

  @Get('google')
  async google(@Res() res: Response, @Query('error_redirect') errorRedirect?: string, @Query('remember_me') rememberMe?: string) {
    const cookieOptions = getCookieOptions()
    const { url, state } = this.authService.redirectToGoogle()

    res.cookie('oauth_state', state, cookieOptions)
    if (errorRedirect?.startsWith('/')) res.cookie('oauth_error_redirect', errorRedirect, cookieOptions)

    if (rememberMe === 'true') res.cookie('oauth_remember_me', 'true', cookieOptions)
    res.redirect(url)
  }

  @Post('login')
  async login(@Res() res: Response, @ClientInfo() client: ClientInfoType, @ZodBody(authLoginSchema) body: AuthLoginDto) {
    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token, user } = await this.authService.login({ client, data: body })
    const refreshMaxAge = body.remember_me ? TOKENS_EXPIRES.REFRESH_TOKEN.REMEMBER_ME : TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT

    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: refreshMaxAge })
    
    res.cookie('session_id', session_id, cookieOptions)
    res.cookie('user', JSON.stringify(user), cookieOptions)
    res.status(200).json({ session: { session_id }, user })
  }

  @Post('register')
  async register(@Res() res: Response, @ClientInfo() client: ClientInfoType, @ZodBody(createRegisterSchema) body: CreateRegisterDto) {
    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token, user } = await this.authService.register({ client, data: body })

    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT })
    
    res.cookie('session_id', session_id, cookieOptions)
    res.cookie('user', JSON.stringify(user), cookieOptions)
    res.status(200).json({ session: { session_id }, user })
  }

  @Post('refresh')
  async refresh(@Res() res: Response, @ZodBody(authRefreshSchema) body: AuthRefreshDto) {
    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token } = await this.authService.refresh(body.session_id, body.refresh_token)

    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT })
    res.status(200).json({ session: { session_id } })
  }

  @Get('github/callback')
  @UseGuards(OAuthProviderRedirectGuard)
  async githubCallback(@Res() res: Response, @Query('code') code: string, @ClientInfo() client: ClientInfoType, @Req() req: Request) {
    const cookieOptions = getCookieOptions()
    const clientUrl = this.configService.get<string>('CLIENT_URL')
    const rememberMe = (req as any).cookies?.['oauth_remember_me'] === 'true'

    const { session_id, access_token, refresh_token, user } = await this.authService.authenticateWithGithub({ code, client, rememberMe })
    const refreshMaxAge = rememberMe ? TOKENS_EXPIRES.REFRESH_TOKEN.REMEMBER_ME : TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT

    res.clearCookie('oauth_remember_me', cookieOptions)
    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: refreshMaxAge })

    res.cookie('session_id', session_id, cookieOptions)
    res.cookie('user', JSON.stringify(user), cookieOptions)
    res.redirect(`${clientUrl}/home`)
  }

  @Get('google/callback')
  @UseGuards(OAuthProviderRedirectGuard)
  async googleLogin(@Res() res: Response, @Query('code') code: string, @ClientInfo() client: ClientInfoType, @Req() req: Request) {
    const cookieOptions = getCookieOptions()
    const clientUrl = this.configService.get<string>('CLIENT_URL')
    const rememberMe = (req as any).cookies?.['oauth_remember_me'] === 'true'

    const { session_id, access_token, refresh_token, user } = await this.authService.authenticateWithGoogle({ client, code, rememberMe })
    const refreshMaxAge = rememberMe ? TOKENS_EXPIRES.REFRESH_TOKEN.REMEMBER_ME : TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT

    res.clearCookie('oauth_remember_me', cookieOptions)
    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: refreshMaxAge })

    res.cookie('session_id', session_id, cookieOptions)
    res.cookie('user', JSON.stringify(user), cookieOptions)
    res.redirect(`${clientUrl}/home`)
  }
}
