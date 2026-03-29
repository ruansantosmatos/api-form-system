import { CookieOptions } from 'express'

export function getCookieOptions(options?: CookieOptions) {
  const isProduction = process.env.NODE_ENV === 'production'

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/',
    ...options,
  }

  return cookieOptions
}
