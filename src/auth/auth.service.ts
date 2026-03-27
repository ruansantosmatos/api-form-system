import { AUTH_METHOD } from 'src/shared/consts/auth-method'
import { AUTH_PROVIDER } from 'src/shared/consts/auth-provider'
import { REVOCATION } from '../shared/consts/revocation-reason'
import { SessionService } from 'src/shared/services/session.service'
import { SecurityService } from '../shared/services/security.service'
import { GithubAuthService } from 'src/shared/services/github-auth.service'
import { GoogleAuthService } from 'src/shared/services/google-auth.service'
import { PrismaClientService } from '../shared/services/prisma-client.service'
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import {
  AuthRevocationSession,
  AuthServiceLogin,
  AuthServiceSignGithub,
  AuthServiceSignGoogle,
  AuthServiceSignUp,
  AuthServiceSignUpGoogle,
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

  async redirectToGithub() {
    const redirectData = this.githubAuthService.buildGithubAuthorizationUrl()
    return redirectData
  }

  async logout(sessionId: number) {
    const now = new Date()
    const reason = REVOCATION.LOGOUT

    const revocation: AuthRevocationSession = { is_valid: false, updated_at: now, revocation_reason: reason }
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } })

    if (!session) throw new BadRequestException('Session not found.')
    await this.prisma.session.update({ where: { id: sessionId }, data: revocation })
    return { message: 'Logged out successfully.' }
  }

  async githubLogin({ code, client }: AuthServiceSignGithub) {
    const { access_token } = await this.githubAuthService.getAccessToken(code)
    const user_github = await this.githubAuthService.getGithubUser(access_token)

    const private_email = await this.githubAuthService.getGithubEmails(access_token)
    const primary_email = private_email.find(e => e.primary && e.verified)?.email

    const name = user_github.name as string
    const provider_id = user_github.id.toString()

    const email = user_github.email ?? (primary_email as string)
    const user = await this.prisma.user.findUnique({ where: { email: email } })

    const auth_method = await this.prisma.authMethod.findFirst({
      where: { provider_id: provider_id, provider: AUTH_PROVIDER.GITHUB },
      include: { user: { select: { id: true } } },
    })

    if (auth_method) {
      const user_id = auth_method.user.id
      const session = await this.sessionService.create({ user_id, client })
      return session
    }

    if (user && !auth_method) {
      await this.githubAuthService.bindAuthMethod(user.id, provider_id)
      const session = await this.sessionService.create({ user_id: user.id, client })
      return session
    }

    const newUser = await this.prisma.user.create({ data: { name: name, email: email } })
    await this.githubAuthService.bindAuthMethod(newUser.id, provider_id)

    const session = await this.sessionService.create({ user_id: newUser.id, client })
    return session
  }

  async signInGoogle({ client, credential }: AuthServiceSignGoogle) {
    const { name, email, email_verified, sub: provider_id } = credential

    if (!email_verified) throw new UnauthorizedException('Google account email not verified.')

    const authMethod = await this.prisma.authMethod.findFirst({
      where: { provider_id: provider_id, provider: AUTH_PROVIDER.GOOGLE },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    if (authMethod) {
      const user_id = authMethod.user.id
      const session = await this.sessionService.create({ user_id, client })
      return { data: { user: authMethod.user, session } }
    }

    if (user) {
      await this.googleAuthService.bindAuthMethod(user.id, provider_id)
      const session = await this.sessionService.create({ user_id: user.id, client })

      const response = { user, session }
      return response
    }

    const newUser = await this.prisma.user.create({ data: { name: name as string, email: email as string } })
    await this.googleAuthService.bindAuthMethod(newUser.id, provider_id)

    const session = await this.sessionService.create({ user_id: newUser.id, client })
    const response = { user: newUser, session: session }
    return { data: response }
  }

  async signIn({ client, data }: AuthServiceLogin) {
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

    const response = { user, session }
    return { data: response }
  }

  async signUp({ client, data }: AuthServiceSignUp) {
    const { name, email, password } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (user) throw new BadRequestException('Email address unavailable for use.')
    const password_hash = await this.securityService.hash(password)

    const newUser = await this.prisma.user.create({ data: { name, email } })
    const user_id = newUser.id

    await this.prisma.authMethod.create({ data: { user_id, type: AUTH_METHOD.PASSWORD, password_hash } })
    const session = await this.sessionService.create({ user_id: newUser.id, client })

    const response = { user: newUser, session: session }
    return { data: response }
  }

  async signUpGoogle({ client, credential }: AuthServiceSignUpGoogle) {
    const { name, email, email_verified, sub: provider_id } = credential
    const user = await this.prisma.user.findUnique({ where: { email: email } })

    if (!email_verified) throw new UnauthorizedException('Google account email not verified.')

    const authMethod = await this.prisma.authMethod.findFirst({
      where: { provider_id: provider_id, provider: AUTH_PROVIDER.GOOGLE },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    if (authMethod) {
      const user_id = authMethod.user.id
      const session = await this.sessionService.create({ user_id, client })
      return { data: { user: authMethod.user, session } }
    }

    if (user) {
      await this.googleAuthService.bindAuthMethod(user.id, provider_id)
      const session = await this.sessionService.create({ user_id: user.id, client })

      const response = { user, session }
      return response
    }

    const newUser = await this.prisma.user.create({ data: { name: name as string, email: email as string } })
    await this.googleAuthService.bindAuthMethod(newUser.id, provider_id)

    const session = await this.sessionService.create({ user_id: newUser.id, client })
    const response = { user: newUser, session: session }
    return { data: response }
  }

  async refresh(sessionId: number, refreshToken: string) {
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
    return { data: refreshedSession }
  }
}
