import { FormService } from './form.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { CurrentUser } from 'src/shared/decorators/current-user.decorator'
import { createFormSchema, type CreateFormDto } from './dto/create-form.dto'
import { updateFormSchema, type UpdateFormDto } from './dto/update-form.dto'
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'

@Controller('forms')
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@ZodBody(createFormSchema) body: CreateFormDto) {
    return this.formService.create({ data: body })
  }

  @Get(':form_id')
  @UseGuards(JwtAuthGuard)
  async getForm(@Param('form_id', ParseIntPipe) form_id: number) {
    return this.formService.getForm({ form_id })
  }

  @Patch(':form_id')
  @UseGuards(JwtAuthGuard)
  async updateForm(@Param('form_id', ParseIntPipe) form_id: number, @CurrentUser() user_id: number, @ZodBody(updateFormSchema) body: UpdateFormDto) {
    return this.formService.updateForm({ form_id, user_id, data: body })
  }

  @Delete(':form_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteForm(@Param('form_id', ParseIntPipe) form_id: number, @CurrentUser() user_id: number) {
    await this.formService.deleteForm({ form_id, user_id })
  }
}
