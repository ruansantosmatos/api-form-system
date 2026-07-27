import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { FieldImageService } from './services/field-image.service'
import { SectionImageService } from './services/section-image.service'
import { createImageSchema, type CreateImageDto } from './dto/create-image.dto'
import { type ImageUploadResult, type ImageDownloadResult } from './interface/image.interface'
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'

@Controller('forms')
export class ImageController {
  constructor(
    private readonly fieldImageService: FieldImageService,
    private readonly sectionImageService: SectionImageService,
  ) {}

  @Post(':form_id/fields/:field_id/image')
  @UseGuards(JwtAuthGuard)
  async requestFieldImageUpload(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
    @ZodBody(createImageSchema) body: CreateImageDto,
  ): Promise<ImageUploadResult> {
    return this.fieldImageService.requestFieldImageUpload({ form_id, field_id, data: body })
  }

  @Get(':form_id/fields/:field_id/image')
  async getFieldImage(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
  ): Promise<ImageDownloadResult> {
    return this.fieldImageService.getFieldImage({ form_id, field_id })
  }

  @Delete(':form_id/fields/:field_id/image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteFieldImage(@Param('form_id', ParseIntPipe) form_id: number, @Param('field_id', ParseIntPipe) field_id: number): Promise<void> {
    await this.fieldImageService.deleteFieldImage({ form_id, field_id })
  }

  @Post(':form_id/sections/:section_id/image')
  @UseGuards(JwtAuthGuard)
  async requestSectionImageUpload(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @ZodBody(createImageSchema) body: CreateImageDto,
  ): Promise<ImageUploadResult> {
    return this.sectionImageService.requestSectionImageUpload({ form_id, section_id, data: body })
  }

  @Get(':form_id/sections/:section_id/image')
  async getSectionImage(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
  ): Promise<ImageDownloadResult> {
    return this.sectionImageService.getSectionImage({ form_id, section_id })
  }

  @Delete(':form_id/sections/:section_id/image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteSectionImage(@Param('form_id', ParseIntPipe) form_id: number, @Param('section_id', ParseIntPipe) section_id: number): Promise<void> {
    await this.sectionImageService.deleteSectionImage({ form_id, section_id })
  }
}
