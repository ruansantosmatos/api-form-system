import { AiCatalogService } from './services/ai-catalog.service'
import { AiCredentialService } from './services/ai-credential.service'
import { AiModelConfigService } from './services/ai-model-config.service'
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard'
import { ZodBody } from 'src/shared/decorators/zod-body.decorator'
import { CurrentUser } from 'src/shared/decorators/current-user.decorator'
import { upsertCredentialSchema, type UpsertCredentialDto } from './dto/upsert-credential.dto'
import { updateModelConfigSchema, type UpdateModelConfigDto } from './dto/update-model-config.dto'
import { Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common'
import type { AiActiveModelResult, AiCredentialResult, AiMessageResult, AiModelConfigResult, AiProviderCatalogItem } from './interface/ai.interface'

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiCatalogService: AiCatalogService,
    private readonly aiCredentialService: AiCredentialService,
    private readonly aiModelConfigService: AiModelConfigService,
  ) {}

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  async getCatalog(@CurrentUser() user_id: number): Promise<AiProviderCatalogItem[]> {
    return this.aiCatalogService.getCatalog(user_id)
  }

  @Get('credentials')
  @UseGuards(JwtAuthGuard)
  async getCredentials(@CurrentUser() user_id: number): Promise<AiCredentialResult[]> {
    return this.aiCredentialService.getCredentials(user_id)
  }

  @Put('providers/:provider_id/credential')
  @UseGuards(JwtAuthGuard)
  async upsertCredential(
    @Param('provider_id', ParseIntPipe) provider_id: number,
    @CurrentUser() user_id: number,
    @ZodBody(upsertCredentialSchema) body: UpsertCredentialDto,
  ): Promise<AiCredentialResult> {
    return this.aiCredentialService.upsertCredential({ user_id, provider_id, ...body })
  }

  @Delete('providers/:provider_id/credential')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteCredential(@Param('provider_id', ParseIntPipe) provider_id: number, @CurrentUser() user_id: number): Promise<void> {
    await this.aiCredentialService.deleteCredential({ user_id, provider_id })
  }

  @Get('models/active')
  @UseGuards(JwtAuthGuard)
  async getActiveModel(@CurrentUser() user_id: number): Promise<AiActiveModelResult> {
    return this.aiModelConfigService.getActiveModel(user_id)
  }

  @Delete('models/active')
  @UseGuards(JwtAuthGuard)
  async deactivateModel(@CurrentUser() user_id: number): Promise<AiMessageResult> {
    return this.aiModelConfigService.deactivateModel(user_id)
  }

  @Post('models/:model_id/activate')
  @UseGuards(JwtAuthGuard)
  async activateModel(@Param('model_id', ParseIntPipe) model_id: number, @CurrentUser() user_id: number): Promise<AiModelConfigResult> {
    return this.aiModelConfigService.activateModel({ user_id, model_id })
  }

  @Get('models/:model_id/config')
  @UseGuards(JwtAuthGuard)
  async getModelConfig(@Param('model_id', ParseIntPipe) model_id: number, @CurrentUser() user_id: number): Promise<AiModelConfigResult> {
    return this.aiModelConfigService.getModelConfig({ user_id, model_id })
  }

  @Patch('models/:model_id/config')
  @UseGuards(JwtAuthGuard)
  async updateModelConfig(
    @Param('model_id', ParseIntPipe) model_id: number,
    @CurrentUser() user_id: number,
    @ZodBody(updateModelConfigSchema) body: UpdateModelConfigDto,
  ): Promise<AiModelConfigResult> {
    return this.aiModelConfigService.updateModelConfig({ user_id, model_id, data: body })
  }
}
