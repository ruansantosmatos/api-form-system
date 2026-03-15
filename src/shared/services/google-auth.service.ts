import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'

@Injectable()
export class GoogleAuthService {
  constructor(private readonly configService: ConfigService) {}

  async verifyToken(token: string) {
    const client = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'))
    const audience = this.configService.get<string>('GOOGLE_CLIENT_ID')

    const ticket = await client.verifyIdToken({ idToken: token, audience: audience })
    return ticket.getPayload()
  }
}
