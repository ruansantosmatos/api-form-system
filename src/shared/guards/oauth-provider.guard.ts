import { Request } from 'express'
import { ConfigService } from '@nestjs/config'
import { RedirectQuery } from '../types/github-guard.type'
import { getCookieOptions } from '../utils/getCookieOptions'
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'

@Injectable()
export class OAuthProviderRedirectGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const CLIENT_URL = this.configService.get<string>('CLIENT_URL')
    const request = context.switchToHttp().getRequest<Request>()

    const response = context.switchToHttp().getResponse()
    const { code, state, error } = request.query as RedirectQuery

    const cookieOptions = getCookieOptions()
    const cookieState = request.cookies['oauth_state'] as string

    if (error) {
      response.clearCookie('oauth_state', cookieOptions)
      return response.redirect(`${CLIENT_URL}?error=${error}`)
    }

    if (!code || !state || !cookieState) {
      response.clearCookie('oauth_state', cookieOptions)
      return response.redirect(`${CLIENT_URL}?error=oauth_invalid`)
    }

    if (state !== cookieState) {
      response.clearCookie('oauth_state', cookieOptions)
      return response.redirect(`${CLIENT_URL}?error=oauth_state_invalid`)
    }

    response.clearCookie('oauth_state', cookieOptions)
    return true
  }
}
