import { REVOCATION } from 'src/shared/consts/revocation-reason'
import { SessionService } from 'src/shared/services/session.service'
import { SecurityService } from 'src/shared/services/security.service'
import { SessionRefreshResult } from 'src/shared/types/session-service.type'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import type { AuthLogoutResult, AuthMeResult, AuthRevocationSession, AuthServiceLogout } from '../interface/auth.interface'

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly sessionService: SessionService,
    private readonly securityService: SecurityService,
  ) {}

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
}
