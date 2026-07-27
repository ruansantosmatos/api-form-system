# Plano de implementação — Integração dos provedores de IA na geração de formulários por prompt

> Documento de planejamento. Não implementa código — descreve o que será construído, por quê, e em que ordem.

## 1. Situação atual

O módulo `src/ai/` já resolve o **cadastro** de provedores/modelos/credenciais, mas não faz nenhuma chamada real a uma IA:

- `AiService` (`src/ai/ai.service.ts`) é puro CRUD sobre 4 tabelas do Prisma: `AiProvider`, `AiModel`, `UserAiCredential`, `UserAiModelConfig`. Permite listar o catálogo, salvar/remover a API key do usuário por provedor, ativar um modelo (com a config de geração) e editar essa config.
- `AiController` expõe `GET providers`, `GET/PUT/DELETE credential`, `GET/DELETE models/active`, `POST models/:id/activate`, `GET/PATCH models/:id/config`. Não existe nenhuma rota de geração.
- O banco já está populado (`prisma/seeds/seed/ai-providers-and-models.ts`) com os 4 provedores e seus modelos:

  | Provedor | Slug | Modelos padrão semeados | `supports_temperature` |
  |---|---|---|---|
  | OpenAI | `openai` | gpt-5 *(default)*, gpt-5-mini, gpt-4.1, gpt-4o-mini | `true` |
  | Anthropic | `anthropic` | claude-opus-5 *(default)*, claude-sonnet-5, claude-opus-4-8, claude-haiku-4-5 | `false` nos 3 primeiros, `true` no Haiku |
  | Google | `google` | gemini-2.5-pro *(default)*, gemini-2.5-flash, gemini-2.0-flash | `true` |
  | DeepSeek | `deepseek` | deepseek-chat *(default)*, deepseek-reasoner | `true` |

- `UserAiModelConfig` já guarda por usuário+modelo: `max_output_tokens`, `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, `system_prompt` e qual é o modelo `is_active` (só um por vez).
- `CryptoService` já criptografa a API key (AES-256-GCM) ao salvar (`encrypt`), mas **nada no código hoje chama `decrypt`** — ou seja, a chave nunca é lida de volta para uso real.
- **Não existe** nenhum SDK de IA instalado (`openai`, `@anthropic-ai/sdk`, `@google/genai` etc. ausentes do `package.json`), nenhum client HTTP dedicado a esses provedores, e nenhuma tabela de uso/custo (`ai_usage_logs`, citada apenas em comentário no seed, não existe no schema).
- `FormService.create` (`src/form/form.service.ts`) hoje só cria `{ title, description }` + um `FormConfig` vazio. Não há criação de `FormSection`/`FormField`/`FormFieldOption` a partir de IA, nem endpoint que aceite um prompt.
- Padrão de integração externa já usado no projeto: chamadas via `fetch` nativo dentro de um service (`google-auth.service.ts`, `github-auth.service.ts`), ou um service "wrapper" fino em torno do SDK do provedor, instanciado no construtor a partir do `ConfigService` (`r2.service.ts` para o S3/R2). A integração de IA deve seguir o segundo padrão (wrapper por SDK), já que os 4 provedores têm SDKs oficiais.

## 2. Objetivo

Quando o usuário enviar um prompt para criar um formulário, o sistema deve:

1. Descobrir qual é o **modelo ativo** do usuário (`UserAiModelConfig.is_active = true`) e a config de geração associada.
2. Recuperar e descriptografar a credencial do provedor dono desse modelo.
3. Montar a requisição para o provedor certo, respeitando os parâmetros que aquele modelo aceita.
4. Obter de volta uma saída **estruturada** (JSON) descrevendo seções, campos, tipos e opções do formulário.
5. Validar essa saída contra as tabelas de domínio (`FieldCategory`/`FieldType`) e persistir como `Form` + `FormSection` + `FormField` + `FormFieldOption`.
6. Registrar uso (tokens, custo estimado, provedor/modelo, sucesso/erro) e atualizar `last_used_at` da credencial.

Cada um dos 4 provedores tem SDK, formato de autenticação e mecanismo de "saída estruturada" próprios — o plano cobre como abstrair isso atrás de uma interface comum.

## 3. Arquitetura proposta

### 3.1 Camada de adapters (`src/ai/providers/`)

Um adapter por provedor, todos implementando a mesma interface:

```ts
interface AiProviderAdapter {
  generateForm(input: AiGenerateFormInput): Promise<AiGenerateFormOutput>
}

interface AiGenerateFormInput {
  apiKey: string              // já descriptografada, nunca logada
  modelSlug: string
  prompt: string               // prompt do usuário
  systemPrompt?: string        // vindo de UserAiModelConfig.system_prompt (combinado com o prompt-base do sistema)
  maxOutputTokens: number
  temperature?: number         // só enviado se model.supports_temperature
  topP?: number
  frequencyPenalty?: number    // só aplicável a OpenAI/DeepSeek
  presencePenalty?: number     // idem
}

interface AiGenerateFormOutput {
  title: string
  description: string
  sections: Array<{
    title?: string
    description?: string
    fields: FieldDraft[]
  }>
  usage: { input_tokens: number; output_tokens: number }
}
```

- `OpenAiAdapter` — SDK `openai`. Usa Chat Completions (ou Responses API) com `response_format`/`text.format` do tipo `json_schema` para forçar a saída no shape acima. `frequency_penalty`/`presence_penalty` mapeiam 1:1.
- `AnthropicAdapter` — SDK `@anthropic-ai/sdk`. Usa `messages.create` com `output_config.format` (`json_schema`) para saída estruturada — **nunca** usar prefill de assistant (não suportado nos modelos atuais: Opus 5, Sonnet 5, Opus 4.8). Só envia `temperature`/`top_p` quando `model.supports_temperature` for `true` (hoje: só Haiku 4.5) — nos demais modelos Claude esse parâmetro nem existe mais e causa erro 400. Não existe `frequency_penalty`/`presence_penalty` na API da Anthropic — esses dois campos de `UserAiModelConfig` são ignorados para esse provedor.
- `GoogleAdapter` — SDK `@google/genai`. Usa `generateContent` com `responseMimeType: "application/json"` + `responseSchema`.
- `DeepSeekAdapter` — a API da DeepSeek é compatível com o formato OpenAI (chat completions). Pode reaproveitar o SDK `openai` apontando `baseURL: "https://api.deepseek.com"`, evitando escrever um cliente HTTP à mão. `deepseek-reasoner` não aceita `temperature`/`top_p`/`frequency_penalty`/`presence_penalty` (particularidade a checar na implementação).

Um **factory/registry** (`AiProviderFactory`) resolve o adapter certo a partir de `provider.slug`, na mesma linha do `AI_PROVIDER` já existente em `src/shared/consts/ai-provider.ts`.

### 3.2 Prompt e schema comuns

Um único **system prompt base** (independente do provedor) descreve o contrato de saída esperado — título, descrição, seções, campos, `category`/`type` (usando os nomes já semeados: `Texto`/`Campo Simples`, `Seleção`/`Multipla Escolha` etc.), `required`, `options` para campos de seleção. O `system_prompt` que o usuário configurou em `UserAiModelConfig` é **anexado**, não substitui, esse prompt-base — ele serve para o usuário dar tom/instruções extras, não para redefinir o contrato de saída.

O mesmo JSON Schema é reaproveitado nos três mecanismos de "structured output" (OpenAI `json_schema`, Anthropic `output_config.format`, Google `responseSchema`), com pequenos ajustes de sintaxe por SDK.

### 3.3 Novo fluxo de geração (`src/form/` ou novo `src/form-generation/`)

Novo endpoint, por exemplo `POST /forms/generate`:

```
POST /forms/generate
{ "prompt": "Crie um formulário de feedback de evento com nome, e-mail e nota de 1 a 5" }
```

Fluxo do service:

1. `AiService.getActiveModel(user_id)` → se não houver modelo ativo, `400 Bad Request` ("nenhum modelo de IA configurado").
2. Buscar a credencial do provedor dono desse modelo; `cryptoService.decrypt(...)`.
3. Montar `AiGenerateFormInput` respeitando `model.supports_temperature` e os limites de `max_output_tokens`/`context_window` do modelo.
4. Chamar `AiProviderFactory.get(provider.slug).generateForm(input)`.
5. Validar a saída (schema + existência de `category`/`type` no banco) — se a IA retornar algo fora do domínio, mapear para o tipo mais próximo ou rejeitar com erro claro.
6. Persistir em transação: `Form` → `FormSection[]` → `FormField[]` (com `category_id`/`type_id`) → `FormFieldOption[]`.
7. Atualizar `UserAiCredential.last_used_at`.
8. Gravar um registro de uso (ver 3.4).
9. Retornar o formulário criado (mesmo formato do `GET /forms/:id` existente).

### 3.4 Observabilidade de uso (novo, fora do escopo do CRUD atual)

Criar a tabela `AiUsageLog` (o comentário do seed já antecipa `ai_usage_logs`, mas ela não existe no schema hoje):

```
AiUsageLog
  id, user_id, provider_id, model_id
  input_tokens, output_tokens
  estimated_cost           // calculado com model.input_cost_per_million / output_cost_per_million
  status                    // success | error
  error_message?
  created_at
```

Serve para: exibir custo estimado ao usuário, detectar abuso, e depurar falhas por provedor.

## 4. Configurações por usuário — o que se aplica a cada provedor

Nem todo campo de `UserAiModelConfig` existe em todo provedor. O adapter de cada provedor é responsável por **descartar silenciosamente** (não repassar) o que não se aplica, e por logar/avisar quando o usuário configurou algo que será ignorado:

| Campo | OpenAI | Anthropic | Google | DeepSeek |
|---|---|---|---|---|
| `max_output_tokens` | ✅ `max_tokens` | ✅ `max_tokens` | ✅ `maxOutputTokens` | ✅ `max_tokens` |
| `temperature` | ✅ | ⚠️ só se `supports_temperature` (hoje só Haiku 4.5) | ✅ | ⚠️ não em `deepseek-reasoner` |
| `top_p` | ✅ | ⚠️ mesma regra de `temperature` | ✅ | ⚠️ mesma regra do DeepSeek |
| `frequency_penalty` | ✅ | ❌ não existe na API | ❌ não existe | ✅ (não em `deepseek-reasoner`) |
| `presence_penalty` | ✅ | ❌ não existe na API | ❌ não existe | ✅ (não em `deepseek-reasoner`) |
| `system_prompt` | ✅ (mensagem `system`) | ✅ (`system`, ou anexado como bloco extra) | ✅ (`systemInstruction`) | ✅ (mensagem `system`) |

O flag `AiModel.supports_temperature` já existente no schema é o mecanismo certo para o caso Anthropic/DeepSeek-reasoner — só falta o adapter respeitá-lo.

## 5. Tratamento de erros e resiliência

- **Erro de autenticação (401/403)** do provedor → devolver mensagem clara ("a chave de API cadastrada para {provider} é inválida ou expirou"), sem vazar a chave em log.
- **Rate limit (429)** → retry com backoff (1–2 tentativas) antes de propagar erro amigável; não expor detalhes internos do provedor ao usuário final.
- **Saída fora do schema esperado** (JSON inválido ou faltando campos) → 1 tentativa de correção (reenviar pedindo para corrigir o JSON) antes de falhar com erro de "não foi possível gerar o formulário".
- **Timeout** → configurar timeout de requisição por provedor (ex.: 60s) coerente com `max_output_tokens` alto.
- Nenhuma chave de API deve aparecer em logs, mensagens de erro devolvidas ao cliente, ou em traces — apenas o `masked_api_key` (`****XXXX`) já usado no restante do módulo.

## 6. Dependências novas

Adicionar ao `package.json`:

- `openai` — cobre OpenAI e DeepSeek (via `baseURL` customizado).
- `@anthropic-ai/sdk` — Anthropic.
- `@google/genai` — Google Gemini.

Nenhuma outra dependência de infraestrutura é necessária — o padrão de service wrapper já existente (`r2.service.ts`) é suficiente.

## 7. Novos arquivos/módulos (visão geral)

```
src/ai/
  providers/
    ai-provider-adapter.interface.ts
    ai-provider.factory.ts
    openai.adapter.ts
    anthropic.adapter.ts
    google.adapter.ts
    deepseek.adapter.ts
  prompts/
    form-generation.prompt.ts        // system prompt base + JSON schema comum
  ai-usage.service.ts                 // grava AiUsageLog, calcula custo estimado

src/form/
  form-generation.service.ts          // orquestra: pega config ativa -> chama adapter -> valida -> persiste
  dto/generate-form.dto.ts            // { prompt: string }
  (form.controller.ts ganha a rota POST /forms/generate)

prisma/schema.prisma
  + model AiUsageLog

prisma/migrations/
  + criação de ai_usage_logs
```

`FormModule` passa a importar `AiModule` (ou um módulo compartilhado) para acessar `AiService`/`AiProviderFactory`.

## 8. Fases de implementação sugeridas

1. **Fundação**: instalar os 3 SDKs; criar a interface `AiProviderAdapter` e o `AiProviderFactory`; implementar `decrypt` sendo de fato usado num fluxo real (hoje só existe `encrypt`).
2. **Prompt/schema comum**: definir o system prompt base e o JSON Schema único de saída, com um conjunto de exemplos de prompt → JSON esperado para validar manualmente antes de plugar nos 4 provedores.
3. **Adapters, um por vez**: começar por OpenAI (mais simples/documentado), depois Anthropic (cuidado com `supports_temperature` e ausência de prefill), depois Google, depois DeepSeek (reuso do adapter OpenAI com `baseURL`).
4. **Endpoint de geração**: `POST /forms/generate` + `FormGenerationService`, com a persistência transacional de `Form`/`FormSection`/`FormField`/`FormFieldOption`.
5. **Observabilidade**: tabela `AiUsageLog`, cálculo de custo estimado, atualização de `last_used_at`.
6. **Resiliência**: tratamento de erros por tipo (auth/rate-limit/schema inválido/timeout), retries e mensagens amigáveis.
7. **Testes**: unitários por adapter (mockando o SDK) + teste de integração do fluxo completo com um provedor mockado.

## 9. Pontos em aberto para decidir antes de implementar

- O prompt de geração deve permitir **anexar contexto** (ex.: um documento) ou só texto puro na primeira versão?
- Deve haver um **limite de formulários gerados por período** por usuário (custo)?
- O que fazer quando o modelo ativo do usuário não suporta bem structured output (nenhum dos modelos semeados hoje tem essa limitação, mas vale documentar a regra para modelos futuros)?
- `AiUsageLog` deve ser exposto por endpoint próprio (histórico de custo) já nesta fase, ou fica só para uso interno por enquanto?
