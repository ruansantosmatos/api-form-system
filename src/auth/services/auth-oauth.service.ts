import { AUTH_PROVIDER } from 'src/shared/consts/auth-provider'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { SessionService } from 'src/shared/services/session.service'
import { ClientInfoType } from 'src/shared/types/client-info.type'
import { SessionCreateResult } from 'src/shared/types/session-service.type'
import { GithubAuthService } from 'src/shared/services/github-auth.service'
import { GoogleAuthService } from 'src/shared/services/google-auth.service'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import type { AuthOAuthRedirectResult, AuthServiceGithub, AuthServiceGoogle } from '../interface/auth.interface'

type AuthMethodWithUser = { user: { id: number } } | null

type ResolveOAuthSession = {
  auth_method: AuthMethodWithUser
  user: { id: number } | null
  client: ClientInfoType
  rememberMe?: boolean
  bindAuthMethod: (user_id: number) => Promise<unknown>
  createUser: () => Promise<{ id: number }>
}

@Injectable()
export class AuthOAuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly sessionService: SessionService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly githubAuthService: GithubAuthService,
  ) {}

  redirectToGithub(): AuthOAuthRedirectResult {
    const response = this.githubAuthService.buildGithubAuthorizationUrl()
    return response
  }

  redirectToGoogle(): AuthOAuthRedirectResult {
    const response = this.googleAuthService.buildGoogleAuthorizationUrl()
    return response
  }

  async authenticateWithGithub({ code, client, rememberMe }: AuthServiceGithub): Promise<SessionCreateResult> {
    const { access_token } = await this.githubAuthService.getAccessToken(code)
    const user_github = await this.githubAuthService.getGithubUser(access_token)

    const private_email = await this.githubAuthService.getGithubEmails(access_token)
    const primary_email = private_email.find(e => e.primary && e.verified)?.email

    const name = user_github.name as string
    const provider_id = user_github.id.toString()

    const provider = AUTH_PROVIDER.GITHUB
    const email = user_github.email ?? primary_email

    if (!email) throw new UnauthorizedException('Github account email not verified.')
    const user = await this.prisma.user.findUnique({ where: { email: email }, select: { id: true } })

    const auth_method = await this.prisma.authMethod.findFirst({
      where: { provider_id, provider },
      include: { user: { select: { id: true } } },
    })

    return this.resolveOAuthSession({
      auth_method,
      user,
      client,
      rememberMe,
      bindAuthMethod: user_id => this.githubAuthService.bindAuthMethod(user_id, provider_id),
      createUser: () => this.prisma.user.create({ data: { name, email } }),
    })
  }

  async authenticateWithGoogle({ client, code, rememberMe }: AuthServiceGoogle): Promise<SessionCreateResult> {
    const { id_token } = await this.googleAuthService.getAccessToken(code)
    const payload = await this.googleAuthService.verifyToken(id_token)

    if (!payload) throw new UnauthorizedException('Google invalid payload')

    const { name, email, email_verified, sub: provider_id } = payload

    if (!email_verified) throw new UnauthorizedException('Google account email not verified.')

    const auth_method = await this.prisma.authMethod.findFirst({
      where: { provider_id: provider_id, provider: AUTH_PROVIDER.GOOGLE },
      include: { user: { select: { id: true } } },
    })

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    return this.resolveOAuthSession({
      auth_method,
      user,
      client,
      rememberMe,
      bindAuthMethod: user_id => this.googleAuthService.bindAuthMethod(user_id, provider_id),
      createUser: () => this.prisma.user.create({ data: { name: name as string, email: email as string } }),
    })
  }

  private async resolveOAuthSession({
    auth_method,
    user,
    client,
    rememberMe,
    bindAuthMethod,
    createUser,
  }: ResolveOAuthSession): Promise<SessionCreateResult> {
    if (auth_method) {
      return this.sessionService.create({ user_id: auth_method.user.id, client, rememberMe })
    }

    if (user) {
      await bindAuthMethod(user.id)
      return this.sessionService.create({ user_id: user.id, client, rememberMe })
    }

    const new_user = await createUser()
    await bindAuthMethod(new_user.id)
    return this.sessionService.create({ user_id: new_user.id, client, rememberMe })
  }
}
