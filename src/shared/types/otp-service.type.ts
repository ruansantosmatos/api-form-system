export type OtpServiceCreate = {
  user_id: number
  purpose: string
  expires_in_ms: number
}

export type OtpServiceVerify = {
  user_id: number
  purpose: string
  code: string
}
