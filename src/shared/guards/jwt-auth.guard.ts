import { Request } from 'express'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'

interface JwtPayload {
  sub: number
  iat: number
  exp: number
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const token = this.extractToken(request)

    if (!token) throw new UnauthorizedException('Access token is missing.')
    const secret = this.configService.getOrThrow<string>('JWT_SECRET')

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret })
      request['user'] = payload
    } catch {
      throw new UnauthorizedException('Access token is invalid or has expired.')
    }

    return true
  }

  private extractToken(request: Request): string | undefined {
    return this.extractFromBearer(request) ?? this.extractFromCookie(request)
  }

  private extractFromBearer(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }

  private extractFromCookie(request: Request): string | undefined {
    return (request.cookies as Record<string, string>)?.access_token
  }
}
