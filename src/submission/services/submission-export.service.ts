import { rm, readFile } from 'fs/promises'
import { MailService } from 'src/shared/services/mail.service'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { buildSubmissionsCsvFile } from '../../shared/utils/build-submissions-csv-file'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { SubmissionServiceExportToEmail, SubmissionExportResult } from '../interface/submission.interface'

@Injectable()
export class SubmissionExportService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly mailService: MailService,
  ) {}

  async exportToEmail({ form_id, user_id }: SubmissionServiceExportToEmail): Promise<SubmissionExportResult> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')
    if (form.user_id !== user_id) throw new ForbiddenException()

    const submissionsCount = await this.prisma.formSubmission.count({ where: { form_id } })
    if (submissionsCount === 0) return { success: false, message: 'This form has no submissions to export' }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: user_id } })

    let filePath: string | null = null

    try {
      filePath = await buildSubmissionsCsvFile(this.prisma, form_id)
      const content = await readFile(filePath)

      await this.mailService.send({
        to: user.email,
        subject: `Exportação das respostas - ${form.title}`,
        template: { id: 'answers', variables: { user_name: user.name } },
        attachments: [{ filename: `${form.title}-respostas.csv`, content }],
      })

      return { success: true, message: `Export sent to ${user.email}` }
    } catch (error) {
      return { success: false, message: 'Failed to export submissions' }
    } finally {
      if (filePath) await rm(filePath, { force: true })
    }
  }
}
