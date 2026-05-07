import { FormService } from './form.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { CurrentUser } from 'src/shared/decorators/current-user.decorator'
import { createFormSchema, type CreateFormDto } from './dto/create-form.dto'
import { updateFormSchema, type UpdateFormDto } from './dto/update-form.dto'
import { createFormSectionSchema, type CreateFormSectionDto } from './dto/create-form-section.dto'
import { updateFormSectionsSchema, type UpdateFormSectionsDto } from './dto/update-form-section.dto'
import { createFormSectionFieldSchema, type CreateFormSectionFieldDto } from './dto/create-form-section-field.dto'
import { updateFormSectionFieldsSchema, type UpdateFormSectionFieldsDto } from './dto/update-form-section-field.dto'
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'

@Controller('forms')
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@ZodBody(createFormSchema) body: CreateFormDto) {
    const form = await this.formService.create({ data: body })
    return form
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

  @Post(':form_id/fields')
  @UseGuards(JwtAuthGuard)
  async createFormField(@Param('form_id', ParseIntPipe) form_id: number, @ZodBody(createFormSectionFieldSchema) body: CreateFormSectionFieldDto) {
    return this.formService.createFormField({ form_id, data: body })
  }

  @Patch(':form_id/fields')
  @UseGuards(JwtAuthGuard)
  async updateFormFields(@Param('form_id', ParseIntPipe) form_id: number, @ZodBody(updateFormSectionFieldsSchema) body: UpdateFormSectionFieldsDto) {
    return this.formService.updateFormFields({ form_id, fields: body.fields })
  }

  @Delete(':form_id/fields/:field_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteFormField(@Param('form_id', ParseIntPipe) form_id: number, @Param('field_id', ParseIntPipe) field_id: number) {
    await this.formService.deleteFormField({ form_id, field_id })
  }

  @Get(':form_id/sections')
  @UseGuards(JwtAuthGuard)
  async getSections(@Param('form_id', ParseIntPipe) form_id: number) {
    return this.formService.getSections({ form_id })
  }

  @Post(':form_id/sections')
  @UseGuards(JwtAuthGuard)
  async createSection(@Param('form_id', ParseIntPipe) form_id: number, @ZodBody(createFormSectionSchema) body: CreateFormSectionDto) {
    return this.formService.createSection({ form_id, data: body })
  }

  @Patch(':form_id/sections')
  @UseGuards(JwtAuthGuard)
  async updateSections(@Param('form_id', ParseIntPipe) form_id: number, @ZodBody(updateFormSectionsSchema) body: UpdateFormSectionsDto) {
    return this.formService.updateSections({ form_id, sections: body.sections })
  }

  @Delete(':form_id/sections/:section_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteSection(@Param('form_id', ParseIntPipe) form_id: number, @Param('section_id', ParseIntPipe) section_id: number) {
    await this.formService.deleteSection({ form_id, section_id })
  }

  @Post(':form_id/sections/:section_id/fields')
  @UseGuards(JwtAuthGuard)
  async createSectionField(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @ZodBody(createFormSectionFieldSchema) body: CreateFormSectionFieldDto,
  ) {
    return this.formService.createSectionField({ form_id, section_id, data: body })
  }

  @Patch(':form_id/sections/:section_id/fields')
  @UseGuards(JwtAuthGuard)
  async updateSectionField(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @ZodBody(updateFormSectionFieldsSchema) body: UpdateFormSectionFieldsDto,
  ) {
    return this.formService.updateSectionField({ form_id, section_id, fields: body.fields })
  }

  @Delete(':form_id/sections/:section_id/fields/:field_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteSectionField(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
  ) {
    await this.formService.deleteSectionField({ form_id, section_id, field_id })
  }
}
