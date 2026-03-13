import { REVOCATION } from '../shared/consts/revocation-reason'
import { SessionService } from 'src/shared/services/session.service'
import { SecurityService } from '../shared/services/security.service'
import { PrismaClientService } from '../shared/services/prisma-client.service'
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthRegisterData, AuthLoginData, AuthRevocationSession } from './interface/auth.interface'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly sessionService: SessionService,
    private readonly securityService: SecurityService,
  ) { }

  async signIn(ipAddress: string, userAgent: string, data: AuthLoginData) {
    const { email, password } = data

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, password: true },
    })

    if (!user) throw new BadRequestException('Invalid email or password.')
    const isPasswordValid = await this.securityService.compare(password, user.password)

    if (!isPasswordValid) throw new BadRequestException('Invalid email or password.')
    const session = await this.sessionService.create(user.id, ipAddress, userAgent)

    const response = { user: { ...user, password: undefined }, session: session }
    return { data: response }
  }

  async signUp(ipAddress: string, userAgent: string, data: AuthRegisterData) {
    const { email, password } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    const hashedPassword = await this.securityService.hash(password)
    if (user) throw new BadRequestException('Email address unavailable for use.')

    const newUser = await this.prisma.user.create({
      data: { ...data, password: hashedPassword },
      select: { id: true, name: true, email: true },
    })

    const session = await this.sessionService.create(newUser.id, ipAddress, userAgent)
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
