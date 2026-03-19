import { AUTH_METHOD } from 'src/shared/consts/auth-method'
import { AUTH_PROVIDER } from 'src/shared/consts/auth-provider'
import { REVOCATION } from '../shared/consts/revocation-reason'
import { SessionService } from 'src/shared/services/session.service'
import { SecurityService } from '../shared/services/security.service'
import { GoogleAuthService } from 'src/shared/services/google-auth.service'
import { PrismaClientService } from '../shared/services/prisma-client.service'
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthRevocationSession, AuthServiceLogin, AuthServiceSignGoogle, AuthServiceSignUp } from './interface/auth.interface'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly sessionService: SessionService,
    private readonly securityService: SecurityService,
    private readonly googleAuthService: GoogleAuthService
  ) { }

  async logout(sessionId: number) {
    const now = new Date()
    const reason = REVOCATION.LOGOUT

    const revocation: AuthRevocationSession = { is_valid: false, updated_at: now, revocation_reason: reason }
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } })

    if (!session) throw new BadRequestException('Session not found.')
    await this.prisma.session.update({ where: { id: sessionId }, data: revocation })
    return { message: 'Logged out successfully.' }
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
      const user_id = authMethod.id
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
      where: { user_id: user.id, type: AUTH_METHOD.PASSWORD }
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
    const { email, password } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (user) throw new BadRequestException('Email address unavailable for use.')
    const password_hash = await this.securityService.hash(password)

    const newUser = await this.prisma.user.create({ data })
    const user_id = newUser.id

    await this.prisma.authMethod.create({ data: { user_id, type: AUTH_METHOD.PASSWORD, password_hash } })
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
