import { AUTH_METHOD } from 'src/shared/consts/auth-method'
import { AUTH_PROVIDER } from 'src/shared/consts/auth-provider'
import { REVOCATION } from '../shared/consts/revocation-reason'
import { SessionService } from 'src/shared/services/session.service'
import { SecurityService } from '../shared/services/security.service'
import { GithubAuthService } from 'src/shared/services/github-auth.service'
import { GoogleAuthService } from 'src/shared/services/google-auth.service'
import { PrismaClientService } from '../shared/services/prisma-client.service'
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { SessionRefreshResult, SessionWithUserResult } from 'src/shared/types/session-service.type'
import {
  AuthServiceLogin,
  AuthServiceSignUp,
  AuthServiceGithub,
  AuthServiceGoogle,
  AuthRevocationSession,
  AuthOAuthRedirectResult,
  AuthLogoutResult,
} from './interface/auth.interface'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly sessionService: SessionService,
    private readonly securityService: SecurityService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly githubAuthService: GithubAuthService,
  ) {}

  redirectToGithub(): AuthOAuthRedirectResult {
    const response = this.githubAuthService.buildGithubAuthorizationUrl()
    return response
  }

  redirectToGoogle(): AuthOAuthRedirectResult {
    const response = this.googleAuthService.buildGoogleAuthorizationUrl()
    return response
  }

  async logout(sessionId: number): Promise<AuthLogoutResult> {
    const now = new Date()
    const reason = REVOCATION.LOGOUT

    const revocation: AuthRevocationSession = { is_valid: false, updated_at: now, revocation_reason: reason }
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } })

    if (!session) throw new BadRequestException('Session not found.')
    await this.prisma.session.update({ where: { id: sessionId }, data: revocation })
    return { message: 'Logged out successfully.' }
  }

  async login({ client, data }: AuthServiceLogin): Promise<SessionWithUserResult> {
    const { email, password } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (!user) throw new BadRequestException('Invalid email or password.')

    const userAuthMethod = await this.prisma.authMethod.findFirst({
      where: { user_id: user.id, type: AUTH_METHOD.PASSWORD },
    })

    if (!userAuthMethod) throw new BadRequestException('Invalid email or password.')
    const hash = userAuthMethod.password_hash as string

    const isPasswordValid = await this.securityService.compare(password, hash)
    if (!isPasswordValid) throw new BadRequestException('Invalid email or password.')

    const session = await this.sessionService.create({ user_id: user.id, client })
    return { ...session, user: { id: user.id, name: user.name, email: user.email } }
  }

  async register({ client, data }: AuthServiceSignUp): Promise<SessionWithUserResult> {
    const { name, email, password } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (user) throw new BadRequestException('Email address unavailable for use.')
    const password_hash = await this.securityService.hash(password)

    const new_user = await this.prisma.user.create({ data: { name, email } })
    const user_id = new_user.id

    await this.prisma.authMethod.create({ data: { user_id, type: AUTH_METHOD.PASSWORD, password_hash } })
    const session = await this.sessionService.create({ user_id: new_user.id, client })
    return { ...session, user: { id: new_user.id, name: new_user.name, email: new_user.email } }
  }

  async refresh(sessionId: number, refreshToken: string): Promise<SessionRefreshResult> {
    const now = new Date()
    const reason = REVOCATION.ABSOLUTE_EXPIRATION

    const revocation: AuthRevocationSession = { is_valid: false, updated_at: now, revocation_reason: reason }
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } })

    if (!session) throw new BadRequestException('Session not found.')

    const isRefreshTokenValid = await this.securityService.compare(refreshToken, session.refresh_token_hash)
    const isExpired = session.refresh_token_expires_at < now

    const isAbsolutelyExpired = session.absolutely_expires_at < now
    const isSessionInvalid = isExpired || isAbsolutelyExpired || !session.is_valid

    if (!isRefreshTokenValid) throw new UnauthorizedException('Invalid refresh token.')

    if (isSessionInvalid) {
      await this.prisma.session.update({ where: { id: session.id }, data: revocation })
      throw new UnauthorizedException('Session expired. Please log in again.')
    }

    const refreshedSession = await this.sessionService.refresh(session.id, session.user_id)
    return refreshedSession
  }

  async authenticateWithGithub({ code, client }: AuthServiceGithub): Promise<SessionWithUserResult> {
    const { access_token } = await this.githubAuthService.getAccessToken(code)
    const user_github = await this.githubAuthService.getGithubUser(access_token)

    const private_email = await this.githubAuthService.getGithubEmails(access_token)
    const primary_email = private_email.find(e => e.primary && e.verified)?.email

    const name = user_github.name as string
    const provider_id = user_github.id.toString()

    const provider = AUTH_PROVIDER.GITHUB
    const email = user_github.email ?? primary_email

    if (!email) throw new UnauthorizedException('Github account email not verified.')
    const user = await this.prisma.user.findUnique({ where: { email: email } })

    const auth_method = await this.prisma.authMethod.findFirst({
      where: { provider_id, provider },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    if (auth_method) {
      const { id, name, email } = auth_method.user
      const session = await this.sessionService.create({ user_id: id, client })
      return { ...session, user: { id, name, email } }
    }

    if (user && !auth_method) {
      await this.githubAuthService.bindAuthMethod(user.id, provider_id)
      const session = await this.sessionService.create({ user_id: user.id, client })
      return { ...session, user: { id: user.id, name: user.name, email: user.email } }
    }

    const new_user = await this.prisma.user.create({ data: { name: name, email: email } })
    await this.githubAuthService.bindAuthMethod(new_user.id, provider_id)

    const session = await this.sessionService.create({ user_id: new_user.id, client })
    return { ...session, user: { id: new_user.id, name: new_user.name, email: new_user.email } }
  }

  async authenticateWithGoogle({ client, code }: AuthServiceGoogle): Promise<SessionWithUserResult> {
    const { id_token } = await this.googleAuthService.getAccessToken(code)
    const payload = await this.googleAuthService.verifyToken(id_token)

    if (!payload) throw new UnauthorizedException('Google invalid payload')

    const { name, email, email_verified, sub: provider_id } = payload

    if (!email_verified) throw new UnauthorizedException('Google account email not verified.')

    const auth_method = await this.prisma.authMethod.findFirst({
      where: { provider_id: provider_id, provider: AUTH_PROVIDER.GOOGLE },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    if (auth_method) {
      const { id, name, email } = auth_method.user
      const session = await this.sessionService.create({ user_id: id, client })
      return { ...session, user: { id, name, email } }
    }

    if (user && !auth_method) {
      await this.googleAuthService.bindAuthMethod(user.id, provider_id)
      const session = await this.sessionService.create({ user_id: user.id, client })
      return { ...session, user: { id: user.id, name: user.name, email: user.email } }
    }

    const new_user = await this.prisma.user.create({ data: { name: name as string, email: email as string } })
    await this.googleAuthService.bindAuthMethod(new_user.id, provider_id)

    const session = await this.sessionService.create({ user_id: new_user.id, client })
    return { ...session, user: { id: new_user.id, name: new_user.name, email: new_user.email } }
  }
}
