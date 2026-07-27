import type { Response, Request } from 'express'
import { ConfigService } from '@nestjs/config'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { AuthOAuthService } from './services/auth-oauth.service'
import { ZodBody } from '../shared/decorators/zod-body.decorator'
import { TOKENS_EXPIRES } from 'src/shared/consts/tokens-expires'
import { AuthSessionService } from './services/auth-session.service'
import { getCookieOptions } from 'src/shared/utils/getCookieOptions'
import { AuthPasswordService } from './services/auth-password.service'
import { type ClientInfoType } from 'src/shared/types/client-info.type'
import { ClientInfo } from 'src/shared/decorators/client-info.decorator'
import { authLoginSchema, type AuthLoginDto } from './dto/auth-login.dto'
import { CurrentUser } from 'src/shared/decorators/current-user.decorator'
import { type AuthLogoutDto, authLogoutSchema } from './dto/auth-logout.dto'
import { type AuthRefreshDto, authRefreshSchema } from './dto/auth-refresh.dto'
import { OAuthProviderRedirectGuard } from 'src/shared/guards/oauth-provider.guard'
import { createRegisterSchema, type CreateRegisterDto } from './dto/auth-register.dto'
import { authForgotPasswordSchema, type AuthForgotPasswordDto } from './dto/auth-forgot-password.dto'
import { authResetPasswordSchema, type AuthResetPasswordDto } from './dto/auth-reset-password.dto'
import { authVerifyTwoFactorSchema, type AuthVerifyTwoFactorDto } from './dto/auth-verify-two-factor.dto'
import { Controller, Get, Injectable, Post, Query, Req, Res, UseGuards } from '@nestjs/common'

@Injectable()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authOAuthService: AuthOAuthService,
    private readonly authSessionService: AuthSessionService,
    private readonly authPasswordService: AuthPasswordService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Res() res: Response, @CurrentUser() user_id: number) {
    const cookieOptions = getCookieOptions()
    const { user } = await this.authSessionService.me(user_id)

    res.cookie('user', JSON.stringify(user), cookieOptions)
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ user })
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@ZodBody(authLogoutSchema) body: AuthLogoutDto, @CurrentUser() user_id: number) {
    return this.authSessionService.logout({ session_id: body.session_id, user_id })
  }

  @Get('github')
  async github(
    @Res() res: Response,
    @Query('error_redirect') errorRedirect?: string,
    @Query('remember_me') rememberMe?: string,
    @Query('redirect') redirect?: string,
  ) {
    const cookieOptions = getCookieOptions()
    const { url, state } = this.authOAuthService.redirectToGithub()

    res.cookie('oauth_state', state, cookieOptions)
    if (errorRedirect?.startsWith('/')) res.cookie('oauth_error_redirect', errorRedirect, cookieOptions)
    if (redirect?.startsWith('/')) res.cookie('oauth_redirect', redirect, cookieOptions)

    if (rememberMe === 'true') res.cookie('oauth_remember_me', 'true', cookieOptions)
    res.redirect(url)
  }

  @Get('google')
  async google(
    @Res() res: Response,
    @Query('error_redirect') errorRedirect?: string,
    @Query('remember_me') rememberMe?: string,
    @Query('redirect') redirect?: string,
  ) {
    const cookieOptions = getCookieOptions()
    const { url, state } = this.authOAuthService.redirectToGoogle()

    res.cookie('oauth_state', state, cookieOptions)
    if (errorRedirect?.startsWith('/')) res.cookie('oauth_error_redirect', errorRedirect, cookieOptions)
    if (redirect?.startsWith('/')) res.cookie('oauth_redirect', redirect, cookieOptions)

    if (rememberMe === 'true') res.cookie('oauth_remember_me', 'true', cookieOptions)
    res.redirect(url)
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  async login(@Res() res: Response, @ClientInfo() client: ClientInfoType, @ZodBody(authLoginSchema) body: AuthLoginDto) {
    const result = await this.authPasswordService.login({ client, data: body })

    if ('requires_2fa' in result) return res.status(200).json(result)

    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token } = result
    const refreshMaxAge = body.remember_me ? TOKENS_EXPIRES.REFRESH_TOKEN.REMEMBER_ME : TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT

    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: refreshMaxAge })

    res.cookie('session_id', session_id, cookieOptions)
    res.status(200).json({ session: { session_id } })
  }

  @Post('login/verify-2fa')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  async verifyTwoFactor(
    @Res() res: Response,
    @ClientInfo() client: ClientInfoType,
    @ZodBody(authVerifyTwoFactorSchema) body: AuthVerifyTwoFactorDto,
  ) {
    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token } = await this.authPasswordService.verifyTwoFactorChallenge({ client, ...body })

    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT })

    res.cookie('session_id', session_id, cookieOptions)
    res.status(200).json({ session: { session_id } })
  }

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  async register(@Res() res: Response, @ClientInfo() client: ClientInfoType, @ZodBody(createRegisterSchema) body: CreateRegisterDto) {
    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token } = await this.authPasswordService.register({ client, data: body })

    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT })

    res.cookie('session_id', session_id, cookieOptions)
    res.status(200).json({ session: { session_id } })
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } })
  async forgotPassword(@ZodBody(authForgotPasswordSchema) body: AuthForgotPasswordDto) {
    return this.authPasswordService.forgotPassword(body)
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  async resetPassword(@ZodBody(authResetPasswordSchema) body: AuthResetPasswordDto) {
    return this.authPasswordService.resetPassword(body)
  }

  @Post('refresh')
  async refresh(@Res() res: Response, @ZodBody(authRefreshSchema) body: AuthRefreshDto) {
    const cookieOptions = getCookieOptions()
    const { session_id, access_token, refresh_token } = await this.authSessionService.refresh(body.session_id, body.refresh_token)

    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT })
    res.status(200).json({ session: { session_id } })
  }

  @Get('github/callback')
  @UseGuards(OAuthProviderRedirectGuard)
  async githubCallback(@Res() res: Response, @Query('code') code: string, @ClientInfo() client: ClientInfoType, @Req() req: Request) {
    const cookieOptions = getCookieOptions()
    const clientUrl = this.configService.get<string>('CLIENT_URL')
    const rememberMe = req.cookies['oauth_remember_me'] === 'true'
    const redirect: string = req.cookies['oauth_redirect'] ?? '/home'

    const { session_id, access_token, refresh_token } = await this.authOAuthService.authenticateWithGithub({ code, client, rememberMe })
    const refreshMaxAge = rememberMe ? TOKENS_EXPIRES.REFRESH_TOKEN.REMEMBER_ME : TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT

    res.clearCookie('oauth_redirect', cookieOptions)
    res.clearCookie('oauth_remember_me', cookieOptions)

    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: refreshMaxAge })

    res.cookie('session_id', session_id, cookieOptions)
    res.redirect(`${clientUrl}${redirect}`)
  }

  @Get('google/callback')
  @UseGuards(OAuthProviderRedirectGuard)
  async googleLogin(@Res() res: Response, @Query('code') code: string, @ClientInfo() client: ClientInfoType, @Req() req: Request) {
    const cookieOptions = getCookieOptions()
    const clientUrl = this.configService.get<string>('CLIENT_URL')

    const rememberMe = req.cookies['oauth_remember_me'] === 'true'
    const redirect: string = req.cookies['oauth_redirect'] ?? '/home'

    const { session_id, access_token, refresh_token } = await this.authOAuthService.authenticateWithGoogle({ client, code, rememberMe })
    const refreshMaxAge = rememberMe ? TOKENS_EXPIRES.REFRESH_TOKEN.REMEMBER_ME : TOKENS_EXPIRES.REFRESH_TOKEN.DEFAULT

    res.clearCookie('oauth_redirect', cookieOptions)
    res.clearCookie('oauth_remember_me', cookieOptions)

    res.cookie('access_token', access_token, { ...cookieOptions, maxAge: TOKENS_EXPIRES.ACCESS_TOKEN })
    res.cookie('refresh_token', refresh_token, { ...cookieOptions, maxAge: refreshMaxAge })

    res.cookie('session_id', session_id, cookieOptions)
    res.redirect(`${clientUrl}${redirect}`)
  }
}
