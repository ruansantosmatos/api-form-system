import { Resend } from 'resend'
import { ConfigService } from '@nestjs/config'
import { Injectable } from '@nestjs/common'
import { SendMailInput, SendMailResult } from '../types/mail-service.type'

@Injectable()
export class MailService {
  private readonly resend: Resend
  private readonly from: string

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')
    const from = this.configService.get<string>('MAIL_FROM')
    if (!apiKey || !from) throw new Error('Resend mail configuration not defined.')

    this.resend = new Resend(apiKey)
    this.from = from
  }

  async send({ to, subject, html, template }: SendMailInput): Promise<SendMailResult> {
    if (!html && !template) throw new Error('Either "html" or "template" must be provided.')

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      ...(template ? { template: { id: template.id, variables: template.variables } } : { html: html! }),
    })

    if (error) throw new Error(error.message)
    return data as SendMailResult
  }
}
