import { Request } from 'express'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

interface JwtPayload {
  sub: number
  iat: number
  exp: number
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const token = this.extractToken(request)
    if (!token) return true

    const secret = this.configService.getOrThrow<string>('JWT_SECRET')
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret })
      request['user'] = payload
    } catch {
      // token inválido tratado como anônimo
    }

    return true
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : (request.cookies as Record<string, string>)?.access_token
  }
}
