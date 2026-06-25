import { SectionService } from './section.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { FormField, FormFieldOption, FormSection } from 'src/generated/prisma/client'
import { createSectionSchema, type CreateSectionDto } from './dto/create-section.dto'
import { updateSectionsSchema, type UpdateSectionsDto } from './dto/update-section.dto'
import { createFieldSchema, type CreateFieldDto } from 'src/field/dto/create-field.dto'
import { updateFieldsSchema, type UpdateFieldsDto } from 'src/field/dto/update-field.dto'
import { type SectionWithFields, type SectionFieldWithRelations } from './interface/section.interface'
import { createFieldOptionSchema, type CreateFieldOptionDto } from 'src/field/dto/create-field-option.dto'
import { updateFieldOptionSchema, type UpdateFieldOptionDto } from 'src/field/dto/update-field-option.dto'
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'

@Controller('forms')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Get(':form_id/sections')
  @UseGuards(JwtAuthGuard)
  async getSections(@Param('form_id', ParseIntPipe) form_id: number): Promise<SectionWithFields[]> {
    return this.sectionService.getSections({ form_id })
  }

  @Post(':form_id/sections')
  @UseGuards(JwtAuthGuard)
  async createSection(@Param('form_id', ParseIntPipe) form_id: number, @ZodBody(createSectionSchema) body: CreateSectionDto): Promise<FormSection> {
    return this.sectionService.createSection({ form_id, data: body })
  }

  @Patch(':form_id/sections')
  @UseGuards(JwtAuthGuard)
  async updateSections(
    @Param('form_id', ParseIntPipe) form_id: number,
    @ZodBody(updateSectionsSchema) body: UpdateSectionsDto,
  ): Promise<FormSection[]> {
    return this.sectionService.updateSections({ form_id, sections: body.sections })
  }

  @Delete(':form_id/sections/:section_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteSection(@Param('form_id', ParseIntPipe) form_id: number, @Param('section_id', ParseIntPipe) section_id: number): Promise<void> {
    await this.sectionService.deleteSection({ form_id, section_id })
  }

  @Get(':form_id/sections/:section_id/fields')
  @UseGuards(JwtAuthGuard)
  async getSectionFields(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
  ): Promise<FormField[]> {
    return this.sectionService.getSectionFields({ form_id, section_id })
  }

  @Post(':form_id/sections/:section_id/clone')
  @UseGuards(JwtAuthGuard)
  async cloneSection(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
  ): Promise<SectionWithFields> {
    return this.sectionService.cloneSection({ form_id, section_id })
  }

  @Post(':form_id/sections/:section_id/fields')
  @UseGuards(JwtAuthGuard)
  async createSectionField(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @ZodBody(createFieldSchema) body: CreateFieldDto,
  ): Promise<SectionFieldWithRelations> {
    return this.sectionService.createSectionField({ form_id, section_id, data: body })
  }

  @Patch(':form_id/sections/:section_id/fields')
  @UseGuards(JwtAuthGuard)
  async updateSectionField(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @ZodBody(updateFieldsSchema) body: UpdateFieldsDto,
  ): Promise<FormField[]> {
    return this.sectionService.updateSectionField({ form_id, section_id, fields: body.fields })
  }

  @Delete(':form_id/sections/:section_id/fields/:field_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteSectionField(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
  ): Promise<void> {
    await this.sectionService.deleteSectionField({ form_id, section_id, field_id })
  }

  @Post(':form_id/sections/:section_id/fields/:field_id/clone')
  @UseGuards(JwtAuthGuard)
  async cloneSectionField(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
  ): Promise<FormField> {
    return this.sectionService.cloneSectionField({ form_id, section_id, field_id })
  }

  @Get(':form_id/sections/:section_id/fields/:field_id/options')
  @UseGuards(JwtAuthGuard)
  async getSectionFieldOptions(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
  ): Promise<FormFieldOption[]> {
    return this.sectionService.getSectionFieldOptions({ form_id, section_id, field_id })
  }

  @Patch(':form_id/sections/:section_id/fields/:field_id/options/:option_id')
  @UseGuards(JwtAuthGuard)
  async updateSectionFieldOption(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
    @Param('option_id', ParseIntPipe) option_id: number,
    @ZodBody(updateFieldOptionSchema) body: UpdateFieldOptionDto,
  ): Promise<FormFieldOption> {
    return this.sectionService.updateSectionFieldOption({ form_id, section_id, field_id, option_id, data: body })
  }

  @Delete(':form_id/sections/:section_id/fields/:field_id/options/:option_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteSectionFieldOption(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
    @Param('option_id', ParseIntPipe) option_id: number,
  ): Promise<void> {
    await this.sectionService.deleteSectionFieldOption({ form_id, section_id, field_id, option_id })
  }

  @Post(':form_id/sections/:source_id/merge/:target_id')
  @UseGuards(JwtAuthGuard)
  async mergeSections(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('source_id', ParseIntPipe) source_id: number,
    @Param('target_id', ParseIntPipe) target_id: number,
  ): Promise<SectionWithFields> {
    return this.sectionService.mergeSections({ form_id, source_id, target_id })
  }

  @Post(':form_id/sections/:section_id/fields/:field_id/options')
  @UseGuards(JwtAuthGuard)
  async createSectionFieldOption(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
    @ZodBody(createFieldOptionSchema) body: CreateFieldOptionDto,
  ): Promise<FormFieldOption> {
    return this.sectionService.createSectionFieldOption({ form_id, section_id, field_id, data: body })
  }
}
