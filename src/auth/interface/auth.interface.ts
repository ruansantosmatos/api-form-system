import { TokenPayload } from 'google-auth-library'
import { Session } from 'src/generated/prisma/client'
import { ClientInfoType } from 'src/shared/types/client-info.type'

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

export type AuthServiceLogin = {
  client: ClientInfoType
  data: AuthLoginData
}

export type AuthServiceGoogle = {
  code: string
  client: ClientInfoType
}

export type AuthServiceGithub = {
  code: string
  client: ClientInfoType
}

export type AuthServiceSignUp = {
  client: ClientInfoType
  data: AuthRegisterData
}
