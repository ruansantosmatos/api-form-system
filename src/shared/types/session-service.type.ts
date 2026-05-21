import { ClientInfoType } from './client-info.type'

export type CreateSessionType = {
  user_id: number
  client: ClientInfoType
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

export type SessionRefreshResult = {
  session_id: number
  updated_at: Date | null
  access_token: string
  refresh_token: string
}
