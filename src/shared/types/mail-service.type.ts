export interface SendMailTemplate {
  id: string
  variables: Record<string, string>
}

export interface SendMailAttachment {
  filename: string
  content: Buffer
}

export interface SendMailInput {
  to: string | string[]
  subject: string
  html?: string
  template?: SendMailTemplate
  attachments?: SendMailAttachment[]
}

export interface SendMailResult {
  id: string
}
