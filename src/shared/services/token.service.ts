import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService, JwtSignOptions } from '@nestjs/jwt'

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateAuthTokens(data: any) {
    const payload = { sub: data }
    const JWT_SECRET = this.configService.get<string>('JWT_SECRET')
    const JWT_REFRESH_SECRET = this.configService.get<string>('JWT_REFRESH_SECRET')

    if (!JWT_SECRET || !JWT_REFRESH_SECRET) throw new Error('JWT secrets not configured.')

    const accessTokenOptions: JwtSignOptions = {
      secret: JWT_SECRET,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') as JwtSignOptions['expiresIn'],
    }

    const refreshTokenOptions: JwtSignOptions = {
      secret: JWT_REFRESH_SECRET,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '5d') as JwtSignOptions['expiresIn'],
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessTokenOptions),
      this.jwtService.signAsync(payload, refreshTokenOptions),
    ])

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    }
  }
}
