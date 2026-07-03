import { FormField } from 'src/generated/prisma/client'
import { FieldService } from './field.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { createFieldSchema, type CreateFieldDto } from './dto/create-field.dto'
import { updateFieldsSchema, type UpdateFieldsDto } from './dto/update-field.dto'
import { createFieldOptionSchema, type CreateFieldOptionDto } from './dto/create-field-option.dto'
import { updateFieldOptionSchema, type UpdateFieldOptionDto } from './dto/update-field-option.dto'
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'

@Controller('forms')
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  @Get('fields/categories/types')
  async getFieldCategories() {
    return this.fieldService.getFieldCategories()
  }

  @Get(':form_id/fields')
  @UseGuards(JwtAuthGuard)
  async getFormFields(@Param('form_id', ParseIntPipe) form_id: number): Promise<FormField[]> {
    return this.fieldService.getFormFields({ form_id })
  }

  @Post(':form_id/fields')
  @UseGuards(JwtAuthGuard)
  async createFormField(@Param('form_id', ParseIntPipe) form_id: number, @ZodBody(createFieldSchema) body: CreateFieldDto) {
    return this.fieldService.createFormField({ form_id, data: body })
  }

  @Patch(':form_id/fields')
  @UseGuards(JwtAuthGuard)
  async updateFormFields(@Param('form_id', ParseIntPipe) form_id: number, @ZodBody(updateFieldsSchema) body: UpdateFieldsDto) {
    return this.fieldService.updateFormFields({ form_id, fields: body.fields })
  }

  @Post(':form_id/fields/:field_id/clone')
  @UseGuards(JwtAuthGuard)
  async cloneFormField(@Param('form_id', ParseIntPipe) form_id: number, @Param('field_id', ParseIntPipe) field_id: number): Promise<FormField> {
    return this.fieldService.cloneFormField({ form_id, field_id })
  }

  @Delete(':form_id/fields/:field_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteFormField(@Param('form_id', ParseIntPipe) form_id: number, @Param('field_id', ParseIntPipe) field_id: number) {
    await this.fieldService.deleteFormField({ form_id, field_id })
  }

  @Get(':form_id/fields/:field_id/options')
  @UseGuards(JwtAuthGuard)
  async getFieldOptions(@Param('form_id', ParseIntPipe) form_id: number, @Param('field_id', ParseIntPipe) field_id: number) {
    return this.fieldService.getFieldOptions({ form_id, field_id })
  }

  @Post(':form_id/fields/:field_id/options')
  @UseGuards(JwtAuthGuard)
  async createFieldOption(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
    @ZodBody(createFieldOptionSchema) body: CreateFieldOptionDto,
  ) {
    return this.fieldService.createFieldOption({ form_id, field_id, data: body })
  }

  @Patch(':form_id/fields/:field_id/options/:option_id')
  @UseGuards(JwtAuthGuard)
  async updateFieldOption(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
    @Param('option_id', ParseIntPipe) option_id: number,
    @ZodBody(updateFieldOptionSchema) body: UpdateFieldOptionDto,
  ) {
    return this.fieldService.updateFieldOption({ form_id, field_id, option_id, data: body })
  }

  @Delete(':form_id/fields/:field_id/options/:option_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteFieldOption(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
    @Param('option_id', ParseIntPipe) option_id: number,
  ) {
    await this.fieldService.deleteFieldOption({ form_id, field_id, option_id })
  }
}
