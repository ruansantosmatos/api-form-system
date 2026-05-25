import { Injectable } from '@nestjs/common'
import { TokenService } from './token.service'
import { SecurityService } from './security.service'
import { PrismaClientService } from './prisma-client.service'
import { getAddDayExpiration } from '../utils/getAddDayExpiration'
import { SESSION_EXPIRES_DAYS } from '../consts/tokens-expires'
import { CreateSessionType, SessionCreateResult, SessionRefreshResult, SessionRefreshType } from '../types/session-service.type'

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly tokenService: TokenService,
    private readonly securityService: SecurityService,
  ) {}

  async create({ user_id, client, rememberMe = false }: CreateSessionType): Promise<SessionCreateResult> {
    const expiresAt = getAddDayExpiration(rememberMe ? SESSION_EXPIRES_DAYS.REFRESH_TOKEN.REMEMBER_ME : SESSION_EXPIRES_DAYS.REFRESH_TOKEN.DEFAULT)
    const absolutelyExpiresAt = getAddDayExpiration(rememberMe ? SESSION_EXPIRES_DAYS.ABSOLUTE.REMEMBER_ME : SESSION_EXPIRES_DAYS.ABSOLUTE.DEFAULT)

    const tokens = await this.tokenService.generateAuthTokens(user_id)
    const hashedRefreshToken = await this.securityService.hash(tokens.refresh_token)

    const newSession = await this.prisma.session.create({
      data: {
        user_id: user_id,
        ip_address: client.ip,
        user_agent: client.userAgent,
        remember_me: rememberMe,
        refresh_token_expires_at: expiresAt,
        refresh_token_hash: hashedRefreshToken,
        absolutely_expires_at: absolutelyExpiresAt,
      },
    })

    return { session_id: newSession.id, ...tokens }
  }

  async refresh({ sessionId, userId, rememberMe, absolutelyExpiresAt }: SessionRefreshType): Promise<SessionRefreshResult> {
    const refreshDays = rememberMe ? SESSION_EXPIRES_DAYS.REFRESH_TOKEN.REMEMBER_ME : SESSION_EXPIRES_DAYS.REFRESH_TOKEN.DEFAULT
    const refreshExpiry = new Date(getAddDayExpiration(refreshDays))
    const expiresAt = refreshExpiry < absolutelyExpiresAt ? refreshExpiry : absolutelyExpiresAt

    const tokens = await this.tokenService.generateAuthTokens(userId)
    const hashedRefreshToken = await this.securityService.hash(tokens.refresh_token)
    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        updated_at: new Date().toISOString(),
        rotation_counter: { increment: 1 },
        refresh_token_expires_at: expiresAt,
        refresh_token_hash: hashedRefreshToken,
      },
    })

    return {
      session_id: updatedSession.id,
      updated_at: updatedSession.updated_at,
      ...tokens,
    }
  }
}
