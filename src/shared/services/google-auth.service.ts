import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'
import { AUTH_METHOD } from '../consts/auth-method'
import { PrismaClientService } from './prisma-client.service'
import { AUTH_PROVIDER } from '../consts/auth-provider'

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly configService: ConfigService,
  ) {}

  async verifyToken(token: string) {
    const client = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'))
    const audience = this.configService.get<string>('GOOGLE_CLIENT_ID')

    if (!client || !audience) throw new Error('Google OAuth configuration not defined.')

    const ticket = await client.verifyIdToken({ idToken: token, audience: audience })
    return ticket.getPayload()
  }

  async bindAuthMethod(userId: number, providerId: string) {
    await this.prisma.authMethod.create({
      data: {
        user_id: userId,
        type: AUTH_METHOD.OAUTH,
        provider_id: providerId,
        provider: AUTH_PROVIDER.GOOGLE,
      },
    })
  }
}
