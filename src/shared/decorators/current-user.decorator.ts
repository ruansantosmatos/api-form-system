import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common'

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest()
  const userId = request['user']?.sub

  if (!userId) throw new UnauthorizedException('User not authenticated.')
  return userId
})
