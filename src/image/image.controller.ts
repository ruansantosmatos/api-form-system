import { ImageService } from './image.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { createImageSchema, type CreateImageDto } from './dto/create-image.dto'
import { type ImageUploadResult, type ImageDownloadResult } from './interface/image.interface'
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'

@Controller('forms')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post(':form_id/fields/:field_id/image')
  @UseGuards(JwtAuthGuard)
  async requestFieldImageUpload(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
    @ZodBody(createImageSchema) body: CreateImageDto,
  ): Promise<ImageUploadResult> {
    return this.imageService.requestFieldImageUpload({ form_id, field_id, data: body })
  }

  @Get(':form_id/fields/:field_id/image')
  async getFieldImage(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('field_id', ParseIntPipe) field_id: number,
  ): Promise<ImageDownloadResult> {
    return this.imageService.getFieldImage({ form_id, field_id })
  }

  @Delete(':form_id/fields/:field_id/image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteFieldImage(@Param('form_id', ParseIntPipe) form_id: number, @Param('field_id', ParseIntPipe) field_id: number): Promise<void> {
    await this.imageService.deleteFieldImage({ form_id, field_id })
  }

  @Post(':form_id/sections/:section_id/image')
  @UseGuards(JwtAuthGuard)
  async requestSectionImageUpload(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
    @ZodBody(createImageSchema) body: CreateImageDto,
  ): Promise<ImageUploadResult> {
    return this.imageService.requestSectionImageUpload({ form_id, section_id, data: body })
  }

  @Get(':form_id/sections/:section_id/image')
  async getSectionImage(
    @Param('form_id', ParseIntPipe) form_id: number,
    @Param('section_id', ParseIntPipe) section_id: number,
  ): Promise<ImageDownloadResult> {
    return this.imageService.getSectionImage({ form_id, section_id })
  }

  @Delete(':form_id/sections/:section_id/image')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteSectionImage(@Param('form_id', ParseIntPipe) form_id: number, @Param('section_id', ParseIntPipe) section_id: number): Promise<void> {
    await this.imageService.deleteSectionImage({ form_id, section_id })
  }
}
