export type GithubTokenResponse = {
  scope: string
  access_token: string
  token_type: 'bearer'
}

export type GithubRequestBody = {
  code: string
  client_id: string
  client_secret: string
  redirect_uri: string
}

export type GithubUserResponse = {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

export type GithubEmail = {
  email: string
  primary: boolean
  verified: boolean
  visibility: 'public' | 'private' | null
}

export type GithubEmailsResponse = GithubEmail[]
