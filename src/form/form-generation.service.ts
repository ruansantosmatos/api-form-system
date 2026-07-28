import { Form } from 'src/generated/prisma/client'
import { AiUsageService } from 'src/ai/services/ai-usage.service'
import { CryptoService } from 'src/shared/services/crypto.service'
import { AiProviderError } from 'src/ai/providers/ai-provider.error'
import { AiProviderFactory } from 'src/ai/providers/ai-provider.factory'
import { PrismaClientService } from 'src/shared/services/prisma-client.service'
import type { FieldCategoryWithTypes, FormGenerationServiceGenerate } from './interface/form.interface'
import type { AiGenerateFormOutput, FormGenerationPayload } from 'src/ai/interface/ai-generation.interface'
import { buildFormGenerationSchema, buildFormGenerationSystemPrompt, type FormGenerationCategory } from 'src/ai/prompts/form-generation.prompt'
import {
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common'

const TITLE_MAX_LENGTH = 100
const LABEL_MAX_LENGTH = 150

@Injectable()
export class FormGenerationService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly cryptoService: CryptoService,
    private readonly aiProviderFactory: AiProviderFactory,
    private readonly aiUsageService: AiUsageService,
  ) {}

  async generateForm({ user_id, prompt }: FormGenerationServiceGenerate): Promise<Form> {
    const activeConfig = await this.prisma.userAiModelConfig.findFirst({
      where: { user_id, is_active: true },
      include: { model: { include: { provider: true } } },
    })

    if (!activeConfig) throw new BadRequestException('No active AI model configured. Activate a model before generating a form.')

    const { model } = activeConfig
    const { provider } = model

    const credential = await this.prisma.userAiCredential.findUnique({
      where: { user_id_provider_id: { user_id, provider_id: provider.id } },
    })

    if (!credential) throw new BadRequestException(`No API key configured for ${provider.name}. Add one before generating a form.`)

    const categories = await this.prisma.fieldCategory.findMany({ include: { fieldTypes: true } })
    
    if (categories.length === 0) throw new InternalServerErrorException('No field categories are configured')

    const generationCategories: FormGenerationCategory[] = categories.map(category => ({
      name: category.name,
      types: category.fieldTypes.map(type => type.name),
    }))

    const systemPrompt = this.buildSystemPrompt(generationCategories, activeConfig.system_prompt)
    const apiKey = this.cryptoService.decrypt(credential.api_key_encrypted)
    const adapter = this.aiProviderFactory.getAdapter(provider.slug)

    let output: AiGenerateFormOutput

    try {
      output = await adapter.generateForm({
        apiKey,
        modelSlug: model.slug,
        prompt,
        systemPrompt,
        maxOutputTokens: activeConfig.max_output_tokens,
        supportsTemperature: model.supports_temperature,
        temperature: activeConfig.temperature?.toNumber() ?? null,
        topP: activeConfig.top_p?.toNumber() ?? null,
        frequencyPenalty: activeConfig.frequency_penalty?.toNumber() ?? null,
        presencePenalty: activeConfig.presence_penalty?.toNumber() ?? null,
        responseSchema: buildFormGenerationSchema(generationCategories),
      })
    } catch (error) {
      await this.aiUsageService.logError({
        user_id,
        provider_id: provider.id,
        model_id: model.id,
        error_message: error instanceof Error ? error.message : 'Unknown error while generating the form',
      })

      throw this.toHttpException(error)
    }

    const form = await this.persistForm({ user_id, payload: output.payload, categories })

    await Promise.all([
      this.prisma.userAiCredential.update({ where: { id: credential.id }, data: { last_used_at: new Date() } }),
      this.aiUsageService.logSuccess({
        user_id,
        provider_id: provider.id,
        model_id: model.id,
        input_tokens: output.usage.input_tokens,
        output_tokens: output.usage.output_tokens,
        input_cost_per_million: model.input_cost_per_million.toNumber(),
        output_cost_per_million: model.output_cost_per_million.toNumber(),
      }),
    ])

    return form
  }

  private buildSystemPrompt(categories: FormGenerationCategory[], userSystemPrompt: string | null): string {
    const basePrompt = buildFormGenerationSystemPrompt(categories)
    if (!userSystemPrompt) return basePrompt
    return `${basePrompt}\n\n---\n\nAdditional instructions from the user, to be followed as long as they don't conflict with the rules above:\n${userSystemPrompt}`
  }

  private toHttpException(error: unknown): HttpException {
    if (!(error instanceof AiProviderError)) return new InternalServerErrorException('Unexpected error while generating the form')

    switch (error.kind) {
      case 'auth':
        return new BadRequestException(error.message)
      case 'rate_limit':
        return new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS)
      case 'invalid_output':
        return new UnprocessableEntityException(error.message)
      case 'timeout':
        return new GatewayTimeoutException(error.message)
      default:
        return new InternalServerErrorException(error.message)
    }
  }

  private async persistForm({
    user_id,
    payload,
    categories,
  }: {
    user_id: number
    payload: FormGenerationPayload
    categories: FieldCategoryWithTypes[]
  }): Promise<Form> {
    if (payload.sections.length === 0) throw new UnprocessableEntityException('The provider returned a form with no sections')

    return this.prisma.$transaction(async tx => {
      const form = await tx.form.create({
        data: {
          user_id,
          title: payload.title.slice(0, TITLE_MAX_LENGTH) || 'Untitled form',
          description: payload.description,
          config: { create: {} },
        },
      })

      let sectionOrder = 0
      for (const section of payload.sections) {
        const createdSection = await tx.formSection.create({
          data: {
            form_id: form.id,
            title: section.title ? section.title.slice(0, LABEL_MAX_LENGTH) : null,
            description: section.description || null,
            order: sectionOrder++,
          },
        })

        let fieldOrder = 0
        for (const field of section.fields) {
          const category = categories.find(c => c.name.toLowerCase() === field.category.toLowerCase())
          if (!category) throw new UnprocessableEntityException(`The provider returned an unknown field category: "${field.category}"`)

          const type = category.fieldTypes.find(t => t.name.toLowerCase() === field.type.toLowerCase())
          if (!type) throw new UnprocessableEntityException(`The provider returned an unknown field type "${field.type}" for category "${field.category}"`)

          const createdField = await tx.formField.create({
            data: {
              section_id: createdSection.id,
              category_id: category.id,
              type_id: type.id,
              label: field.label.slice(0, LABEL_MAX_LENGTH) || 'Untitled field',
              required: field.required,
              order: fieldOrder++,
            },
          })

          if (field.options.length > 0) {
            await tx.formFieldOption.createMany({
              data: field.options.map(option => ({
                field_id: createdField.id,
                label: option.label.slice(0, LABEL_MAX_LENGTH),
                value: option.value.slice(0, LABEL_MAX_LENGTH),
              })),
            })
          }
        }
      }

      return form
    })
  }
}
