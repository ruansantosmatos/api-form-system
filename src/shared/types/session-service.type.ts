import { ClientInfoType } from './client-info.type'

export type CreateSessionType = {
  user_id: number
  client: ClientInfoType
  rememberMe?: boolean
}

export type SessionUser = {
  id: number
  name: string
  email: string
}

export type SessionCreateResult = {
  session_id: number
  access_token: string
  refresh_token: string
}

export type SessionWithUserResult = SessionCreateResult & { user: SessionUser }

export type SessionRefreshType = {
  sessionId: number
  userId: number
  rememberMe: boolean
  absolutelyExpiresAt: Date
}

export type SessionRefreshResult = {
  session_id: number
  updated_at: Date | null
  access_token: string
  refresh_token: string
}
