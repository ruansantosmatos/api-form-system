import { Session } from 'src/generated/prisma/client'
import { ClientInfoType } from 'src/shared/types/client-info.type'

export type AuthRevocationSession = Pick<Session, 'is_valid' | 'updated_at' | 'revocation_reason'>

export type AuthOAuthRedirectResult = { url: string; state: string }

export type AuthLogoutResult = { message: string }

export interface AuthLoginData {
  email: string
  password: string
  remember_me: boolean
}

export interface AuthRegisterData {
  name: string
  email: string
  password: string
}

export type AuthServiceLogin = {
  client: ClientInfoType
  data: AuthLoginData
}

export type AuthServiceGoogle = {
  code: string
  client: ClientInfoType
  rememberMe?: boolean
}

export type AuthServiceGithub = {
  code: string
  client: ClientInfoType
  rememberMe?: boolean
}

export type AuthServiceSignUp = {
  client: ClientInfoType
  data: AuthRegisterData
}
