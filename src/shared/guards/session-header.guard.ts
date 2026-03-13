import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class SessionHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const sessionId = request.headers['x-session-id']

    if (!sessionId) throw new UnauthorizedException('Session header missing')
    return true
  }
}
