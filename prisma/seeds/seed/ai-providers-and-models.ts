import { prismaClient } from '../config/prisma-client'

type ModelSeed = {
  slug: string
  name: string
  description?: string
  context_window: number
  max_output_tokens: number
  input_cost_per_million: number
  output_cost_per_million: number
  supports_temperature?: boolean
  is_default?: boolean
}

type ProviderSeed = {
  slug: string
  name: string
  description: string
  website_url: string
  models: ModelSeed[]
}

// Prices are USD per 1 million tokens and are used only to estimate the cost
// recorded in ai_usage_logs. They are a snapshot (2026-07) — re-run this seed
// after a provider changes its price list.
const providers: ProviderSeed[] = [
  {
    slug: 'openai',
    name: 'OpenAI',
    description: 'Modelos GPT da OpenAI.',
    website_url: 'https://platform.openai.com',
    models: [
      {
        slug: 'gpt-5',
        name: 'GPT-5',
        description: 'Modelo de maior capacidade da OpenAI.',
        context_window: 400_000,
        max_output_tokens: 128_000,
        input_cost_per_million: 1.25,
        output_cost_per_million: 10,
        is_default: true,
      },
      {
        slug: 'gpt-5-mini',
        name: 'GPT-5 mini',
        description: 'Equilíbrio entre custo e capacidade.',
        context_window: 400_000,
        max_output_tokens: 128_000,
        input_cost_per_million: 0.25,
        output_cost_per_million: 2,
      },
      {
        slug: 'gpt-4.1',
        name: 'GPT-4.1',
        description: 'Geração anterior, contexto de 1M tokens.',
        context_window: 1_047_576,
        max_output_tokens: 32_768,
        input_cost_per_million: 2,
        output_cost_per_million: 8,
      },
      {
        slug: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        description: 'Opção mais econômica para tarefas simples.',
        context_window: 128_000,
        max_output_tokens: 16_384,
        input_cost_per_million: 0.15,
        output_cost_per_million: 0.6,
      },
    ],
  },
  {
    slug: 'anthropic',
    name: 'Anthropic',
    description: 'Modelos Claude da Anthropic.',
    website_url: 'https://platform.claude.com',
    models: [
      {
        slug: 'claude-opus-5',
        name: 'Claude Opus 5',
        description: 'Modelo mais capaz da linha Opus. Não aceita o parâmetro temperature.',
        context_window: 1_000_000,
        max_output_tokens: 128_000,
        input_cost_per_million: 5,
        output_cost_per_million: 25,
        supports_temperature: false,
        is_default: true,
      },
      {
        slug: 'claude-sonnet-5',
        name: 'Claude Sonnet 5',
        description: 'Melhor relação entre velocidade e inteligência. Não aceita o parâmetro temperature.',
        context_window: 1_000_000,
        max_output_tokens: 128_000,
        input_cost_per_million: 3,
        output_cost_per_million: 15,
        supports_temperature: false,
      },
      {
        slug: 'claude-opus-4-8',
        name: 'Claude Opus 4.8',
        description: 'Geração anterior do Opus. Não aceita o parâmetro temperature.',
        context_window: 1_000_000,
        max_output_tokens: 128_000,
        input_cost_per_million: 5,
        output_cost_per_million: 25,
        supports_temperature: false,
      },
      {
        slug: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        description: 'Mais rápido e econômico para tarefas simples.',
        context_window: 200_000,
        max_output_tokens: 64_000,
        input_cost_per_million: 1,
        output_cost_per_million: 5,
      },
    ],
  },
  {
    slug: 'google',
    name: 'Google',
    description: 'Modelos Gemini do Google.',
    website_url: 'https://ai.google.dev',
    models: [
      {
        slug: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Modelo de maior capacidade do Gemini.',
        context_window: 1_048_576,
        max_output_tokens: 65_536,
        input_cost_per_million: 1.25,
        output_cost_per_million: 10,
        is_default: true,
      },
      {
        slug: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Equilíbrio entre custo e velocidade.',
        context_window: 1_048_576,
        max_output_tokens: 65_536,
        input_cost_per_million: 0.3,
        output_cost_per_million: 2.5,
      },
      {
        slug: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Opção mais econômica para alto volume.',
        context_window: 1_048_576,
        max_output_tokens: 8_192,
        input_cost_per_million: 0.1,
        output_cost_per_million: 0.4,
      },
    ],
  },
  {
    slug: 'deepseek',
    name: 'DeepSeek',
    description: 'Modelos da DeepSeek, com forte custo-benefício.',
    website_url: 'https://platform.deepseek.com',
    models: [
      {
        slug: 'deepseek-chat',
        name: 'DeepSeek Chat',
        description: 'Modelo de uso geral.',
        context_window: 128_000,
        max_output_tokens: 8_192,
        input_cost_per_million: 0.27,
        output_cost_per_million: 1.1,
        is_default: true,
      },
      {
        slug: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        description: 'Otimizado para raciocínio em múltiplas etapas. Não aceita o parâmetro temperature.',
        context_window: 128_000,
        max_output_tokens: 65_536,
        input_cost_per_million: 0.55,
        output_cost_per_million: 2.19,
        supports_temperature: false,
      },
    ],
  },
]

export async function aiProvidersAndModels() {
  try {
    for (const { models, ...provider } of providers) {
      const { id: provider_id } = await prismaClient.aiProvider.upsert({
        where: { slug: provider.slug },
        create: provider,
        update: { ...provider, updated_at: new Date() },
        select: { id: true },
      })

      for (const model of models) {
        const data = {
          ...model,
          supports_temperature: model.supports_temperature ?? true,
          is_default: model.is_default ?? false,
        }

        await prismaClient.aiModel.upsert({
          where: { provider_id_slug: { provider_id, slug: model.slug } },
          create: { ...data, provider_id },
          update: { ...data, updated_at: new Date() },
        })
      }
    }
  } catch (error) {
    console.error('[aiProvidersAndModels] Seed failed:', error)
    throw error
  }
}
