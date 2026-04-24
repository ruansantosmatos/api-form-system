import { FormService } from './form.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { createFormSchema, type CreateFormDto } from './dto/create-form.dto'
import { createFormSectionSchema, type CreateFormSectionDto } from './dto/create-form-section.dto'
import { updateFormSectionsSchema, type UpdateFormSectionsDto } from './dto/update-form-section.dto'
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
}
