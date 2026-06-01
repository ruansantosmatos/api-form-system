import { FormService } from './form.service'
import { Form } from 'src/generated/prisma/client'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { ZodQuery } from 'src/shared/decorators/zod-query.decorator'
import { CurrentUser } from 'src/shared/decorators/current-user.decorator'
import { type FormPaginatedResult, type FormWithRelations } from './interface/form.interface'
import { createFormSchema, type CreateFormDto } from './dto/create-form.dto'
import { updateFormSchema, type UpdateFormDto } from './dto/update-form.dto'
import { getAllFormsSchema, type GetAllFormsDto } from './dto/get-all-forms.dto'
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'

@Controller('forms')
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(@CurrentUser() user_id: number, @ZodQuery(getAllFormsSchema) query: GetAllFormsDto): Promise<FormPaginatedResult> {
    return this.formService.getAll({ user_id, ...query })
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@ZodBody(createFormSchema) body: CreateFormDto): Promise<Form> {
    return this.formService.create({ data: body })
  }

  @Get(':form_id')
  @UseGuards(JwtAuthGuard)
  async getForm(@Param('form_id', ParseIntPipe) form_id: number): Promise<FormWithRelations> {
    return this.formService.getForm({ form_id })
  }

  @Patch(':form_id')
  @UseGuards(JwtAuthGuard)
  async updateForm(@Param('form_id', ParseIntPipe) form_id: number, @CurrentUser() user_id: number, @ZodBody(updateFormSchema) body: UpdateFormDto): Promise<Form> {
    return this.formService.updateForm({ form_id, user_id, data: body })
  }

  @Delete(':form_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteForm(@Param('form_id', ParseIntPipe) form_id: number, @CurrentUser() user_id: number): Promise<void> {
    await this.formService.deleteForm({ form_id, user_id })
  }
}
