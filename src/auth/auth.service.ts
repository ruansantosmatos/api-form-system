import { randomBytes, createHash } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { AUTH_METHOD } from 'src/shared/consts/auth-method'
import { AUTH_PROVIDER } from 'src/shared/consts/auth-provider'
import { REVOCATION } from '../shared/consts/revocation-reason'
import { TokenService } from 'src/shared/services/token.service'
import { MailService } from 'src/shared/services/mail.service'
import { TwoFactorService } from 'src/shared/services/two-factor.service'
import { SessionService } from 'src/shared/services/session.service'
import { TOKENS_EXPIRES } from 'src/shared/consts/tokens-expires'
import { SecurityService } from '../shared/services/security.service'
import { GithubAuthService } from 'src/shared/services/github-auth.service'
import { GoogleAuthService } from 'src/shared/services/google-auth.service'
import { PrismaClientService } from '../shared/services/prisma-client.service'
import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { SessionRefreshResult, SessionCreateResult } from 'src/shared/types/session-service.type'
import {
  AuthLoginResult,
  AuthServiceLogin,
  AuthServiceSignUp,
  AuthServiceGithub,
  AuthServiceGoogle,
  AuthRevocationSession,
  AuthOAuthRedirectResult,
  AuthLogoutResult,
  AuthServiceLogout,
  AuthServiceForgotPassword,
  AuthServiceResetPassword,
  AuthForgotPasswordResult,
  AuthResetPasswordResult,
  AuthServiceVerifyTwoFactor,
  AuthMeResult,
} from './interface/auth.interface'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
    private readonly twoFactorService: TwoFactorService,
    private readonly configService: ConfigService,
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

  async me(user_id: number): Promise<AuthMeResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, name: true, email: true },
    })

    if (!user) throw new UnauthorizedException('Access token is invalid or has expired.')
    return { user }
  }

  async logout({ session_id, user_id }: AuthServiceLogout): Promise<AuthLogoutResult> {
    const now = new Date()
    const reason = REVOCATION.LOGOUT

    const revocation: AuthRevocationSession = { is_valid: false, updated_at: now, revocation_reason: reason }
    const session = await this.prisma.session.findUnique({ where: { id: session_id, user_id } })

    if (!session) throw new BadRequestException('Session not found.')

    if (session.user_id !== user_id) throw new ForbiddenException('Access denied.')

    await this.prisma.session.update({ where: { id: session_id, user_id }, data: revocation })
    return { message: 'Logged out successfully.' }
  }

  async login({ client, data }: AuthServiceLogin): Promise<AuthLoginResult> {
    const { email, password, remember_me } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (!user) throw new BadRequestException('Invalid email or password.')

    const userAuthMethod = await this.prisma.authMethod.findFirst({
      where: { user_id: user.id, type: AUTH_METHOD.PASSWORD },
    })

    if (!userAuthMethod) throw new BadRequestException('Invalid email or password.')
    const hash = userAuthMethod.password_hash as string

    const isPasswordValid = await this.securityService.compare(password, hash)
    if (!isPasswordValid) throw new BadRequestException('Invalid email or password.')

    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({ where: { user_id: user.id } })

    if (twoFactorAuth?.is_enabled) {
      const challenge_token = await this.tokenService.generateChallengeToken(user.id, 'two_factor_login')
      return { requires_2fa: true, challenge_token }
    }

    const session = await this.sessionService.create({ user_id: user.id, client, rememberMe: remember_me })
    return session
  }

  async verifyTwoFactorChallenge({ client, challenge_token, code }: AuthServiceVerifyTwoFactor): Promise<SessionCreateResult> {
    let payload: { sub: number; purpose: string }

    try {
      payload = await this.tokenService.verifyChallengeToken(challenge_token)
    } catch {
      throw new UnauthorizedException('Challenge token is invalid or has expired.')
    }

    if (payload.purpose !== 'two_factor_login') throw new UnauthorizedException('Challenge token is invalid or has expired.')

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) throw new UnauthorizedException('Challenge token is invalid or has expired.')

    await this.twoFactorService.verifyCode({ user_id: user.id, code })

    const session = await this.sessionService.create({ user_id: user.id, client })
    return session
  }

  async register({ client, data }: AuthServiceSignUp): Promise<SessionCreateResult> {
    const { name, email, password } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (user) throw new BadRequestException('Email address unavailable for use.')
    const password_hash = await this.securityService.hash(password)

    const new_user = await this.prisma.user.create({ data: { name, email } })
    const user_id = new_user.id

    await this.prisma.authMethod.create({ data: { user_id, type: AUTH_METHOD.PASSWORD, password_hash } })
    const session = await this.sessionService.create({ user_id: new_user.id, client })
    return session
  }

  async refresh(sessionId: number, refreshToken: string): Promise<SessionRefreshResult> {
    const now = new Date()
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } })

    if (!session) throw new BadRequestException('Session not found.')

    const isRefreshTokenValid = await this.securityService.compare(refreshToken, session.refresh_token_hash)
    const isExpired = session.refresh_token_expires_at < now

    const isAbsolutelyExpired = session.absolutely_expires_at < now
    const isSessionInvalid = isExpired || isAbsolutelyExpired || !session.is_valid

    if (!isRefreshTokenValid) {
      if (!isSessionInvalid) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: {
            is_valid: false,
            updated_at: now,
            revocation_reason: REVOCATION.SUSPICIOUS_TOKEN_REUSE,
          },
        })
      }
      throw new UnauthorizedException('Invalid refresh token.')
    }

    if (isSessionInvalid) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          is_valid: false,
          updated_at: now,
          revocation_reason: REVOCATION.ABSOLUTE_EXPIRATION,
        },
      })
      throw new UnauthorizedException('Session expired. Please log in again.')
    }

    const refreshedSession = await this.sessionService.refresh({
      sessionId: session.id,
      userId: session.user_id,
      rememberMe: session.remember_me,
      absolutelyExpiresAt: session.absolutely_expires_at,
    })
    return refreshedSession
  }

  async authenticateWithGithub({ code, client, rememberMe }: AuthServiceGithub): Promise<SessionCreateResult> {
    const { access_token } = await this.githubAuthService.getAccessToken(code)
    const user_github = await this.githubAuthService.getGithubUser(access_token)

    const private_email = await this.githubAuthService.getGithubEmails(access_token)
    const primary_email = private_email.find(e => e.primary && e.verified)?.email

    const name = user_github.name as string
    const provider_id = user_github.id.toString()

    const provider = AUTH_PROVIDER.GITHUB
    const email = user_github.email ?? primary_email

    if (!email) throw new UnauthorizedException('Github account email not verified.')
    const user = await this.prisma.user.findUnique({ where: { email: email }, select: { id: true } })

    const auth_method = await this.prisma.authMethod.findFirst({
      where: { provider_id, provider },
      include: { user: { select: { id: true } } },
    })

    if (auth_method) {
      const { id } = auth_method.user
      const session = await this.sessionService.create({ user_id: id, client, rememberMe })
      return session
    }

    if (user && !auth_method) {
      await this.githubAuthService.bindAuthMethod(user.id, provider_id)
      const session = await this.sessionService.create({ user_id: user.id, client, rememberMe })
      return session
    }

    const new_user = await this.prisma.user.create({ data: { name: name, email: email } })
    await this.githubAuthService.bindAuthMethod(new_user.id, provider_id)

    const session = await this.sessionService.create({ user_id: new_user.id, client, rememberMe })
    return session
  }

  async authenticateWithGoogle({ client, code, rememberMe }: AuthServiceGoogle): Promise<SessionCreateResult> {
    const { id_token } = await this.googleAuthService.getAccessToken(code)
    const payload = await this.googleAuthService.verifyToken(id_token)

    if (!payload) throw new UnauthorizedException('Google invalid payload')

    const { name, email, email_verified, sub: provider_id } = payload

    if (!email_verified) throw new UnauthorizedException('Google account email not verified.')

    const auth_method = await this.prisma.authMethod.findFirst({
      where: { provider_id: provider_id, provider: AUTH_PROVIDER.GOOGLE },
      include: { user: { select: { id: true } } },
    })

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (auth_method) {
      const { id } = auth_method.user
      const session = await this.sessionService.create({ user_id: id, client, rememberMe })
      return session
    }

    if (user && !auth_method) {
      await this.googleAuthService.bindAuthMethod(user.id, provider_id)
      const session = await this.sessionService.create({ user_id: user.id, client, rememberMe })
      return session
    }

    const new_user = await this.prisma.user.create({ data: { name: name as string, email: email as string } })
    await this.googleAuthService.bindAuthMethod(new_user.id, provider_id)

    const session = await this.sessionService.create({ user_id: new_user.id, client, rememberMe })
    return session
  }

  async forgotPassword({ email }: AuthServiceForgotPassword): Promise<AuthForgotPasswordResult> {
    const message = 'If an account with that email exists, a password reset link has been sent.'
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (!user) return { message }

    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + TOKENS_EXPIRES.PASSWORD_RESET)

    await this.prisma.passwordResetToken.create({ data: { user_id: user.id, token_hash: tokenHash, expires_at: expiresAt } })
    const clientUrl = this.configService.get<string>('CLIENT_URL')
    const resetLink = `${clientUrl}/reset?token=${token}`
    const expiresInHours = TOKENS_EXPIRES.PASSWORD_RESET / (60 * 60 * 1000)

    await this.mailService.send({
      to: user.email,
      subject: 'Alteração de senha',
      template: {
        id: 'password-reset-1',
        variables: {
          user_name: user.name,
          reset_link: resetLink,
          app_name: this.configService.get<string>('APP_NAME', 'FormSystem'),
          expires_in: `${expiresInHours} hora${expiresInHours === 1 ? '' : 's'}`,
        },
      },
    })

    return { message }
  }

  async resetPassword({ token, password }: AuthServiceResetPassword): Promise<AuthResetPasswordResult> {
    const now = new Date()
    const tokenHash = createHash('sha256').update(token).digest('hex')

    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { token_hash: tokenHash } })
    if (!resetToken || resetToken.used_at || resetToken.expires_at < now) throw new BadRequestException('Invalid or expired token.')

    const password_hash = await this.securityService.hash(password)
    const authMethod = await this.prisma.authMethod.findFirst({ where: { user_id: resetToken.user_id, type: AUTH_METHOD.PASSWORD } })

    authMethod
      ? await this.prisma.authMethod.update({ where: { id: authMethod.id }, data: { password_hash } })
      : await this.prisma.authMethod.create({ data: { user_id: resetToken.user_id, type: AUTH_METHOD.PASSWORD, password_hash } })

    await this.prisma.passwordResetToken.updateMany({
      where: { user_id: resetToken.user_id, used_at: null },
      data: { used_at: now },
    })

    return { message: 'Password reset successfully.' }
  }
}
