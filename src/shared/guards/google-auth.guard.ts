import { GoogleAuthService } from '../services/google-auth.service'
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = request.body?.credential

    if (!token) throw new UnauthorizedException('Credential not provided')

    try {
      const payload = await this.googleAuthService.verifyToken(token)
      request.body.credential = payload
      return true
    } catch (error) {
      throw new UnauthorizedException('Invalid credential')
    }
  }
}
