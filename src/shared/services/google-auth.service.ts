import * as crypto from 'crypto'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'
import { AUTH_METHOD } from '../consts/auth-method'
import { AUTH_PROVIDER } from '../consts/auth-provider'
import { PrismaClientService } from './prisma-client.service'
import { GoogleTokenResponse } from '../types/google-service.type'

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly configService: ConfigService,
  ) {}

  buildGoogleAuthorizationUrl() {
    const state = crypto.randomBytes(32).toString('hex')
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')

    const callbackUrl = this.configService.get<string>('GOOGLE_CALLBACK_URL')
    if (!clientId || !callbackUrl) throw new Error('Google OAuth configuration not defined.')

    const params = new URLSearchParams({
      state,
      prompt: 'consent',
      client_id: clientId,
      response_type: 'code',
      access_type: 'offline',
      redirect_uri: callbackUrl,
      scope: 'openid email profile',
    })

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    return { url, state }
  }

  async getAccessToken(code: string) {
    const method = 'POST'
    const url = 'https://oauth2.googleapis.com/token'
    const headers: HeadersInit = { 'Content-Type': 'application/x-www-form-urlencoded' }

    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')
    const redirectUri = this.configService.get<string>('GOOGLE_CALLBACK_URL')

    if (!clientId || !clientSecret || !redirectUri) throw new Error('Google configuration not defined.')

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    const configRequest: RequestInit = {
      method: method,
      headers: headers,
      body: params.toString(),
    }

    const response = await fetch(url, configRequest)
    if (!response.ok) throw new Error(`Failed to exchange code google`)

    const data = (await response.json()) as GoogleTokenResponse
    return data
  }

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
