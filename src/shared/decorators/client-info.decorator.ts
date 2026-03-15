import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const ClientInfo = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest()
  const ip = req.ip

  const userAgent = req.headers['user-agent']
  return { ip, userAgent }
})
