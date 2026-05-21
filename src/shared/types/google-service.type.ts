export type GoogleTokenResponse = {
  scope: string
  id_token: string
  expires_in: number
  token_type: string
  access_token: string
  refresh_token: string
}

export type GoogleOAuthRedirectResult = {
  url: string
  state: string
}
