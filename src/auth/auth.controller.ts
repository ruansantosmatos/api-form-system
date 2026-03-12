import { AuthService } from './auth.service'
import { Controller, Injectable, Ip, Post } from '@nestjs/common'
import { ZodBody } from '../shared/decorators/zod-body.decorator'
import { UserAgent } from 'src/shared/decorators/user-agent.decorator'
import { createRegisterSchema, type CreateRegisterDto } from './dto/create-register.dto'

@Injectable()
@Controller('auth')
export class AuthController {
  
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(
    @Ip() ip: string,
    @UserAgent() userAgent: string,
    @ZodBody(createRegisterSchema) body: CreateRegisterDto
  ) {
    const data = await this.authService.signUp(ip, userAgent, body)
    return data
  }
}
