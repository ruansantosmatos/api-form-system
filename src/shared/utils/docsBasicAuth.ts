import { timingSafeEqual } from 'crypto'
import type { NextFunction, Request, Response } from 'express'

function safeCompare(received: string | undefined, expected: string): boolean {
  const receivedBuffer = Buffer.from(received ?? '')
  const expectedBuffer = Buffer.from(expected)

  if (receivedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(receivedBuffer, expectedBuffer)
}

export function docsBasicAuth(req: Request, res: Response, next: NextFunction) {
  const docsUser = process.env.DOCS_USER
  const docsPassword = process.env.DOCS_PASSWORD

  if (!docsUser || !docsPassword) {
    res.status(503).end('Documentation is not available.')
    return
  }

  const [scheme, encoded] = req.headers.authorization?.split(' ') ?? []

  if (scheme === 'Basic' && encoded) {
    const [receivedUser, receivedPassword] = Buffer.from(encoded, 'base64').toString().split(':')

    if (safeCompare(receivedUser, docsUser) && safeCompare(receivedPassword, docsPassword)) {
      next()
      return
    }
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"')
  res.status(401).end('Authentication required.')
}
