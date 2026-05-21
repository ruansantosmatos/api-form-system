import * as crypto from 'crypto'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AUTH_METHOD } from '../consts/auth-method'
import { AUTH_PROVIDER } from '../consts/auth-provider'
import { GITHUB_OAUTH } from '../consts/github-oauth'
import { PrismaClientService } from './prisma-client.service'
import {
  GithubEmailsResponse,
  GithubOAuthRedirectResult,
  GithubRequestBody,
  GithubTokenResponse,
  GithubUserResponse,
} from '../types/github-provider.type'

@Injectable()
export class GithubAuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly configService: ConfigService,
  ) {}

  async bindAuthMethod(userId: number, providerId: string): Promise<void> {
    await this.prisma.authMethod.create({
      data: {
        user_id: userId,
        type: AUTH_METHOD.OAUTH,
        provider_id: providerId,
        provider: AUTH_PROVIDER.GITHUB,
      },
    })
  }

  buildGithubAuthorizationUrl(): GithubOAuthRedirectResult {
    const state = crypto.randomBytes(32).toString('hex')
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID')

    const callbackUrl = this.configService.get<string>('GITHUB_CALLBACK_URL')
    if (!clientId || !callbackUrl) throw new Error('GitHub OAuth configuration not defined.')

    const params = new URLSearchParams({
      state,
      client_id: clientId,
      allow_signup: 'true',
      redirect_uri: callbackUrl,
      scope: 'read:user user:email',
    })

    const url = `${GITHUB_OAUTH.AUTH_URL}?${params.toString()}`
    return { url, state }
  }

  async getAccessToken(code: string): Promise<GithubTokenResponse> {
    const method = 'POST'
    const url = GITHUB_OAUTH.TOKEN_URL

    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID')
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET')

    const redirectUri = this.configService.get<string>('GITHUB_CALLBACK_URL')
    const invalidCredentials = !clientId || !clientSecret || !redirectUri

    if (invalidCredentials) throw new Error('GitHub OAuth configuration not defined.')

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const body: GithubRequestBody = {
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      client_secret: clientSecret,
    }

    const configRequest: RequestInit = {
      method: method,
      headers: headers,
      body: JSON.stringify(body),
    }

    const response = await fetch(url, configRequest)
    if (!response.ok) throw new Error('Failed to fetch GitHub access token')

    const data = (await response.json()) as GithubTokenResponse
    if (!data.access_token) throw new Error('Invalid GitHub token response')
    return data
  }

  async getGithubUser(access_token: string): Promise<GithubUserResponse> {
    const url = GITHUB_OAUTH.USER_URL

    const headers: HeadersInit = {
      Authorization: `Bearer ${access_token}`,
      Accept: 'application/json',
    }

    const configRequest: RequestInit = {
      method: 'GET',
      headers: headers,
    }

    const response = await fetch(url, configRequest)
    if (!response.ok) throw new Error('Failed to fetch GitHub user')

    const data = (await response.json()) as GithubUserResponse
    if (!data.id || !data.login) throw new Error('Invalid GitHub user response')
    return data
  }

  async getGithubEmails(access_token: string): Promise<GithubEmailsResponse> {
    const headers: HeadersInit = { Authorization: `Bearer ${access_token}`, Accept: 'application/json' }
    const response = await fetch(GITHUB_OAUTH.EMAILS_URL, { headers: headers })

    if (!response.ok) throw new Error('Failed to fetch GitHub emails')
    return (await response.json()) as GithubEmailsResponse
  }
}
