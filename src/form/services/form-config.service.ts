import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { FormConfig, FormServiceGetFormConfig, FormServiceUpdateFormConfig } from '../interface/form.interface'

@Injectable()
export class FormConfigService {
  constructor(private readonly prisma: PrismaClientService) {}

  async getFormConfig({ form_id }: FormServiceGetFormConfig): Promise<FormConfig> {
    const config = await this.prisma.formConfig.findUnique({ where: { form_id } })
    if (!config) throw new NotFoundException('Form config not found')
    return config
  }

  async updateFormConfig({ form_id, user_id, data }: FormServiceUpdateFormConfig): Promise<FormConfig> {
    const form = await this.prisma.form.findUnique({ where: { id: form_id } })
    if (!form) throw new NotFoundException('Form not found')

    if (form.user_id !== user_id) throw new ForbiddenException('Form not access')
    return this.prisma.formConfig.update({ where: { form_id }, data })
  }
}
