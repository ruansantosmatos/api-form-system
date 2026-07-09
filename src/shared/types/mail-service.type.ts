export interface SendMailTemplate {
  id: string
  variables: Record<string, string>
}

export interface SendMailInput {
  to: string | string[]
  subject: string
  html?: string
  template?: SendMailTemplate
}

export interface SendMailResult {
  id: string
}
