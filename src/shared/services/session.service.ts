import { Injectable } from '@nestjs/common'
import { TokenService } from './token.service'
import { SecurityService } from './security.service'
import { PrismaClientService } from './prisma-client.service'
import { getAddDayExpiration } from '../utils/getAddDayExpiration'

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly tokenService: TokenService,
    private readonly securityService: SecurityService,
  ) {}

  async create(userId: number, ipAddress: string, userAgent: string) {
    const expiresAt = getAddDayExpiration(5)
    const absolutelyExpiresAt = getAddDayExpiration(30)

    const tokens = await this.tokenService.generateAuthTokens(userId)
    const hashedRefreshToken = await this.securityService.hash(tokens.refresh_token)

    const newSession = await this.prisma.session.create({
      data: {
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        refresh_token_expires_at: expiresAt,
        refresh_token_hash: hashedRefreshToken,
        absolutely_expires_at: absolutelyExpiresAt,
      },
    })

    return { session_id: newSession.id, ...tokens }
  }

  async refresh(sessionId: number, userId: number) {
    const expiresAt = getAddDayExpiration(5)
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
      ...tokens,
      session_id: updatedSession.id,
      updated_at: updatedSession.updated_at,
    }
  }
}
