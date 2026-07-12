import { CookieOptions } from 'express'

export function getCookieOptions(options?: CookieOptions) {
  const isProduction = process.env.NODE_ENV === 'production'
  const domain = isProduction ? process.env.COOKIE_DOMAIN : undefined

  const cookieOptions: CookieOptions = {
    path: '/',
    httpOnly: true,
    domain: domain,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    ...options,
  }

  return cookieOptions
}
