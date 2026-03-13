import { Session } from 'src/generated/prisma/client'

export type AuthRevocationSession = Pick<Session, 'is_valid' | 'updated_at' | 'revocation_reason'>

export interface AuthLoginData {
  email: string
  password: string
}

export interface AuthRegisterData {
  name: string
  email: string
  password: string
}
