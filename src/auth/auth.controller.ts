import { AuthService } from './auth.service'
import { UserAgent } from 'src/shared/decorators/user-agent.decorator'
import { ZodValidationPipe } from 'src/shared/pipes/zod-validation.pipe'
import { Body, Controller, Injectable, Ip, Post, UsePipes } from '@nestjs/common'
import { createRegisterSchema, type CreateRegisterDto } from './dto/create-register.dto'

@Injectable()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  @UsePipes(new ZodValidationPipe(createRegisterSchema))
  async register(@Ip() ip: string, @UserAgent() userAgent: string, @Body() body: CreateRegisterDto) {
    const data = await this.authService.signUp(ip, userAgent, body)
    return data
  }
}
