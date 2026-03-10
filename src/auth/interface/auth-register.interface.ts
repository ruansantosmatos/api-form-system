export interface AuthRegisterData {
  name: string
  email: string
  password: string
}

export interface SessionData {
  userId: number
  expiresAt: Date
  ipAddress: string
  userAgent: string
  refreshToken: string
}
