import { randomBytes, createHash } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { AUTH_METHOD } from 'src/shared/consts/auth-method'
import { MailService } from 'src/shared/services/mail.service'
import { TokenService } from 'src/shared/services/token.service'
import { TOKENS_EXPIRES } from 'src/shared/consts/tokens-expires'
import { SessionService } from 'src/shared/services/session.service'
import { SecurityService } from 'src/shared/services/security.service'
import { TwoFactorService } from 'src/shared/services/two-factor.service'
import { SessionCreateResult } from 'src/shared/types/session-service.type'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import type {
  AuthLoginResult,
  AuthServiceLogin,
  AuthServiceSignUp,
  AuthServiceForgotPassword,
  AuthServiceResetPassword,
  AuthForgotPasswordResult,
  AuthResetPasswordResult,
  AuthServiceVerifyTwoFactor,
} from '../interface/auth.interface'

@Injectable()
export class AuthPasswordService {
  constructor(
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaClientService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly securityService: SecurityService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async login({ client, data }: AuthServiceLogin): Promise<AuthLoginResult> {
    const { email, password, remember_me } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (!user) throw new BadRequestException('Invalid email or password.')

    const userAuthMethod = await this.prisma.authMethod.findFirst({
      where: { user_id: user.id, type: AUTH_METHOD.PASSWORD },
    })

    if (!userAuthMethod) throw new BadRequestException('Invalid email or password.')
    const hash = userAuthMethod.password_hash as string

    const isPasswordValid = await this.securityService.compare(password, hash)
    if (!isPasswordValid) throw new BadRequestException('Invalid email or password.')

    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({ where: { user_id: user.id } })

    if (twoFactorAuth?.is_enabled) {
      const challenge_token = await this.tokenService.generateChallengeToken(user.id, 'two_factor_login')
      return { requires_2fa: true, challenge_token }
    }

    const session = await this.sessionService.create({ user_id: user.id, client, rememberMe: remember_me })
    return session
  }

  async verifyTwoFactorChallenge({ client, challenge_token, code }: AuthServiceVerifyTwoFactor): Promise<SessionCreateResult> {
    let payload: { sub: number; purpose: string }

    try {
      payload = await this.tokenService.verifyChallengeToken(challenge_token)
    } catch {
      throw new UnauthorizedException('Challenge token is invalid or has expired.')
    }

    if (payload.purpose !== 'two_factor_login') throw new UnauthorizedException('Challenge token is invalid or has expired.')

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) throw new UnauthorizedException('Challenge token is invalid or has expired.')

    await this.twoFactorService.verifyCode({ user_id: user.id, code })

    const session = await this.sessionService.create({ user_id: user.id, client })
    return session
  }

  async register({ client, data }: AuthServiceSignUp): Promise<SessionCreateResult> {
    const { name, email, password } = data
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (user) throw new BadRequestException('Email address unavailable for use.')
    const password_hash = await this.securityService.hash(password)

    const new_user = await this.prisma.user.create({ data: { name, email } })
    const user_id = new_user.id

    await this.prisma.authMethod.create({ data: { user_id, type: AUTH_METHOD.PASSWORD, password_hash } })
    const session = await this.sessionService.create({ user_id: new_user.id, client })
    return session
  }

  async forgotPassword({ email }: AuthServiceForgotPassword): Promise<AuthForgotPasswordResult> {
    const message = 'If an account with that email exists, a password reset link has been sent.'
    const user = await this.prisma.user.findUnique({ where: { email } })

    if (!user) return { message }

    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + TOKENS_EXPIRES.PASSWORD_RESET)

    await this.prisma.passwordResetToken.create({ data: { user_id: user.id, token_hash: tokenHash, expires_at: expiresAt } })
    const clientUrl = this.configService.get<string>('CLIENT_URL')
    
    const resetLink = `${clientUrl}/reset?token=${token}`
    const expiresInHours = TOKENS_EXPIRES.PASSWORD_RESET / (60 * 60 * 1000)

    await this.mailService.send({
      to: user.email,
      subject: 'Alteração de senha',
      template: {
        id: 'password-reset-1',
        variables: {
          user_name: user.name,
          reset_link: resetLink,
          app_name: this.configService.get<string>('APP_NAME', 'FormSystem'),
          expires_in: `${expiresInHours} hora${expiresInHours === 1 ? '' : 's'}`,
        },
      },
    })

    return { message }
  }

  async resetPassword({ token, password }: AuthServiceResetPassword): Promise<AuthResetPasswordResult> {
    const now = new Date()
    const tokenHash = createHash('sha256').update(token).digest('hex')

    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { token_hash: tokenHash } })
    if (!resetToken || resetToken.used_at || resetToken.expires_at < now) throw new BadRequestException('Invalid or expired token.')

    const password_hash = await this.securityService.hash(password)
    const authMethod = await this.prisma.authMethod.findFirst({ where: { user_id: resetToken.user_id, type: AUTH_METHOD.PASSWORD } })

    authMethod
      ? await this.prisma.authMethod.update({ where: { id: authMethod.id }, data: { password_hash } })
      : await this.prisma.authMethod.create({ data: { user_id: resetToken.user_id, type: AUTH_METHOD.PASSWORD, password_hash } })

    await this.prisma.passwordResetToken.updateMany({
      where: { user_id: resetToken.user_id, used_at: null },
      data: { used_at: now },
    })

    return { message: 'Password reset successfully.' }
  }
}
