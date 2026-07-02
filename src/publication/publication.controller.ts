import { FormPublication } from 'src/generated/prisma/client'
import { PublicationService } from './publication.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { type FormPublicationWithStatus } from './interface/publication.interface'
import { updatePublicationSchema, type UpdatePublicationDto } from './dto/update-publication.dto'
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'

@Controller('forms')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Get('publication/:hash')
  async getByHash(@Param('hash') hash: string): Promise<FormPublicationWithStatus> {
    return this.publicationService.getByHash({ hash })
  }

  @Post(':form_id/publication')
  @UseGuards(JwtAuthGuard)
  async publish(@Param('form_id', ParseIntPipe) form_id: number): Promise<FormPublication> {
    return this.publicationService.publish({ form_id })
  }

  @Get(':form_id/publication')
  @UseGuards(JwtAuthGuard)
  async getPublication(@Param('form_id', ParseIntPipe) form_id: number): Promise<FormPublication | null> {
    return this.publicationService.getPublication({ form_id })
  }

  @Patch(':form_id/publication')
  @UseGuards(JwtAuthGuard)
  async updatePublication(
    @Param('form_id', ParseIntPipe) form_id: number,
    @ZodBody(updatePublicationSchema) body: UpdatePublicationDto,
  ): Promise<FormPublication> {
    return this.publicationService.updatePublication({ form_id, data: body })
  }

  @Delete(':form_id/publication')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deactivatePublication(@Param('form_id', ParseIntPipe) form_id: number): Promise<void> {
    await this.publicationService.deactivatePublication({ form_id })
  }
}
