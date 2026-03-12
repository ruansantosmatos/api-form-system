import { TokenService } from '../shared/services/token.service'
import { BadRequestException, Injectable } from '@nestjs/common'
import { SecurityService } from '../shared/services/security.service'
import { getAddDayExpiration } from '../shared/utils/getAddDayExpiration'
import { PrismaClientService } from '../shared/services/prisma-client.service'
import { AuthRegisterData, AuthLoginData } from './interface/auth-register.interface'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly tokenService: TokenService,
    private readonly securityService: SecurityService,
  ) {}

  async signIn(ipAddress: string, userAgent: string, data: AuthLoginData) {
    const { email, password } = data
    const expiresAt = getAddDayExpiration(7)
    const absolutelyExpiresAt = getAddDayExpiration(30)

    const user = await this.prisma.user.findUnique({ 
      where: { email },
      select: { id: true, name: true, email: true, password: true },
    })

    if (!user) throw new BadRequestException('Invalid email or password.')
    const isPasswordValid = await this.securityService.compare(password, user.password)

    if (!isPasswordValid) throw new BadRequestException('Invalid email or password.')
    const tokens = await this.tokenService.generateAuthTokens(user.id)
    const hashedRefreshToken = await this.securityService.hash(tokens.refresh_token)

    await this.prisma.session.create({
      data: {
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        refresh_token_expires_at: expiresAt,
        refresh_token_hash: hashedRefreshToken,
        absolutely_expires_at: absolutelyExpiresAt,
      },
    })

    return { user: { ...user, password: undefined }, session: tokens }
  }

  async signUp(ipAddress: string, userAgent: string, data: AuthRegisterData) {
    const { email, password } = data
    const expiresAt = getAddDayExpiration(7)
    const absolutelyExpiresAt = getAddDayExpiration(30)

    const user = await this.prisma.user.findUnique({ where: { email } })
    const hashedPassword = await this.securityService.hash(password)
    if (user) throw new BadRequestException('Email address unavailable for use.')

    const newUser = await this.prisma.user.create({
      data: { ...data, password: hashedPassword },
      select: { id: true, name: true, email: true },
    })

    const userId = newUser.id
    const tokens = await this.tokenService.generateAuthTokens(newUser.id)
    const hashedRefreshToken = await this.securityService.hash(tokens.refresh_token)

    await this.prisma.session.create({
      data: {
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        refresh_token_expires_at: expiresAt,
        refresh_token_hash: hashedRefreshToken,
        absolutely_expires_at: absolutelyExpiresAt,
      },
    })

    return { user: newUser, session: tokens }
  }
}
