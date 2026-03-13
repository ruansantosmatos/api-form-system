import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const SessionId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  const sessionId = request.headers['x-session-id']
  return sessionId ? parseInt(sessionId ) : undefined
})
