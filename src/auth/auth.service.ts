import { BadRequestException, Injectable } from '@nestjs/common'
import { TokenService } from 'src/shared/services/token.service'
import { SecurityService } from 'src/shared/services/security.service'
import { getAddDayExpiration } from 'src/shared/utils/getAddDayExpiration'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { AuthRegisterData, SessionData } from './interface/auth-register.interface'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly TokenService: TokenService,
    private readonly securityService: SecurityService,
  ) {}

  async signUp(ipAddress: string, userAgent: string, data: AuthRegisterData) {
    const expiresAt = getAddDayExpiration(7)
    const { email, password } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (user) throw new BadRequestException('Email address unavailable for use.')
    const hashedPassword = await this.securityService.hash(password)

    const newUser = await this.prisma.user.create({
      data: { ...data, password: hashedPassword },
      select: { id: true, name: true, email: true },
    })

    const userId = newUser.id
    const tokens = await this.TokenService.generateAuthTokens(newUser.id)

    const hashedRefreshToken = await this.securityService.hash(tokens.refresh_token)
    const sessionData: SessionData = { userId, ipAddress, userAgent, expiresAt, refreshToken: hashedRefreshToken }

    await this.prisma.session.create({ data: sessionData })
    return { ...newUser, ...tokens }
  }
}
