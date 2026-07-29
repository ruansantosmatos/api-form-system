# Arquitetura

Como e por quê o FormSystem API foi construído da forma como está — não repete o contrato de rotas (ver [📖 Documentação da API](README.md#-documentação-da-api) no README). Leia isto se você precisa entender um fluxo completo (não só um endpoint) ou tomar uma decisão de design consistente com o que já existe.

## 📑 Sumário

- [Modelo de dados](#modelo-de-dados)
- [Fluxo de autenticação](#fluxo-de-autenticação)
- [Sessões, refresh e rotação de tokens](#sessões-refresh-e-rotação-de-tokens)
- [Login social (OAuth)](#login-social-oauth)
- [Publicação e resposta de formulários](#publicação-e-resposta-de-formulários)
- [Upload de imagens](#upload-de-imagens)
- [Geração de formulário via IA](#geração-de-formulário-via-ia)
- [Decisões de arquitetura](#decisões-de-arquitetura)

## Modelo de dados

Entidades principais e seus relacionamentos (ver `prisma/schema.prisma` para o schema completo, incluindo colunas):

```mermaid
erDiagram
    User ||--o{ Form : "cria"
    User ||--o{ Session : "possui"
    User ||--o{ AuthMethod : "possui"
    User ||--o| TwoFactorAuth : "configura"
    User ||--o| AccountSettings : "tem"
    User ||--o{ FormSubmission : "responde (opcional)"
    User ||--o{ UserAiCredential : "cadastra"
    User ||--o{ UserAiModelConfig : "configura"

    AiProvider ||--o{ AiModel : "oferece"
    AiProvider ||--o{ UserAiCredential : "recebe credencial"
    AiModel ||--o{ UserAiModelConfig : "é configurado em"

    Form ||--o| FormConfig : "tem"
    Form ||--o| FormPublication : "tem"
    Form ||--o{ FormSection : "tem"
    Form ||--o{ FormField : "tem (campos soltos)"
    Form ||--o{ FormSubmission : "recebe"

    FormSection ||--o{ FormField : "agrupa"
    FormSection ||--o| Image : "ilustra"

    FormField ||--o{ FormFieldOption : "tem opções"
    FormField ||--o| Image : "ilustra"
    FieldCategory ||--o{ FieldType : "classifica"
    FieldType ||--o{ FormField : "tipa"

    FormSubmission ||--o{ FormSubmissionAnswer : "contém"
    FormSubmissionAnswer ||--o{ FormSubmissionAnswerOption : "seleciona (campos de opção)"
```

Pontos que não são óbvios olhando só o schema:

- `FormField.form_id` **e** `FormField.section_id` são opcionais e mutuamente relevantes: um campo pertence a um formulário diretamente (fora de seções) ou a uma seção — nunca precisa dos dois para existir.
- `Image` é dona da FK (`field_id` / `section_id`), não o contrário — por isso um campo/seção tem no máximo uma imagem (`@unique` nas duas colunas).
- `FormSubmission.respondent_id` é opcional: `FormConfig.allow_anonymous` decide se a resposta pode ser criada sem usuário autenticado.
- `UserAiModelConfig` tem `@@unique([user_id, model_id])` e `is_active`: o usuário pode ter configurações salvas para vários modelos, mas só uma pode estar ativa por vez (aplicado em código, não por constraint de banco). `UserAiCredential` é `@@unique([user_id, provider_id])` — uma credencial por provedor por usuário, sobrescrita em upsert.
- `AiUsageLog` (não representado no diagrama para não poluir) registra cada chamada de geração — sucesso (tokens e custo) ou falha (`error_message`) — usada para auditoria e não para controle de acesso.

## Fluxo de autenticação

Login por senha, com desvio para desafio de 2FA quando a conta tem TOTP habilitado:

```mermaid
sequenceDiagram
    participant C as Client
    participant A as AuthController
    participant S as AuthService
    participant DB as MariaDB

    C->>A: POST /auth/login {email, password}
    A->>S: login()
    S->>DB: busca User + AuthMethod(password)
    S->>S: compara hash da senha (bcrypt)
    alt 2FA habilitado
        S-->>A: { requires_2fa: true, challenge_token }
        A-->>C: 200 { requires_2fa, challenge_token }
        C->>A: POST /auth/login/verify-2fa {challenge_token, code}
        A->>S: verifyTwoFactorChallenge()
        S->>S: valida challenge_token + código TOTP/backup code
        S->>DB: cria Session
        S-->>A: { session_id, access_token, refresh_token }
    else sem 2FA
        S->>DB: cria Session
        S-->>A: { session_id, access_token, refresh_token }
    end
    A-->>C: Set-Cookie access_token, refresh_token, session_id
```

`/auth/login` e `/auth/login/verify-2fa` são limitados a 5 tentativas/minuto (`@Throttle`) — proteção contra força bruta, não é o rate limit global.

## Sessões, refresh e rotação de tokens

Cada sessão guarda o **hash** do refresh token atual (`sessions.refresh_token_hash`), não o token em si. A cada `/auth/refresh`, o token é rotacionado: o antigo deixa de ser válido e um novo hash é salvo, com `rotation_counter` incrementado.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as AuthService
    participant DB as MariaDB

    C->>S: POST /auth/refresh {session_id, refresh_token}
    S->>DB: busca Session por id
    S->>S: compara refresh_token com refresh_token_hash

    alt hash não confere
        Note over S,DB: possível replay de token roubado/antigo
        S->>DB: marca sessão inválida (revocation_reason=SUSPICIOUS_TOKEN_REUSE)
        S-->>C: 401 Invalid refresh token
    else sessão expirada (relativa ou absoluta)
        S->>DB: marca sessão inválida (revocation_reason=ABSOLUTE_EXPIRATION)
        S-->>C: 401 Session expired
    else válido
        S->>DB: gera novos tokens, atualiza hash, rotation_counter++
        S-->>C: novos access_token + refresh_token
    end
```

Duas expirações coexistem por sessão: `refresh_token_expires_at` (janela deslizante, estendida a cada refresh) e `absolutely_expires_at` (teto fixo desde a criação — a sessão morre mesmo com refreshes contínuos). `remember_me` só afeta a duração dessas janelas, definidas em `TOKENS_EXPIRES`/`SESSION_EXPIRES_DAYS`.

## Login social (OAuth)

Google e GitHub seguem o mesmo formato: o `state` do OAuth e as preferências do fluxo (`redirect`, `remember_me`) são guardados em cookies temporários antes do redirect para o provedor, e lidos de volta no callback.

```mermaid
sequenceDiagram
    participant C as Client
    participant A as AuthController
    participant P as Provider (Google/GitHub)
    participant S as AuthService

    C->>A: GET /auth/google?redirect=/x&remember_me=true
    A->>A: Set-Cookie oauth_state, oauth_redirect, oauth_remember_me
    A-->>C: redirect para o provedor
    C->>P: login/consentimento
    P-->>C: redirect para /auth/google/callback?code=...
    C->>A: GET /auth/google/callback
    A->>S: authenticateWithGoogle(code)
    S->>P: troca code por token, valida e-mail verificado
    alt AuthMethod já vinculado ao provider_id
        S->>S: usa o User vinculado
    else e-mail já existe sem esse provider
        S->>S: vincula AuthMethod ao User existente
    else conta nova
        S->>S: cria User + AuthMethod
    end
    S-->>A: cria Session
    A-->>C: Set-Cookie tokens + redirect para CLIENT_URL
```

Vincular por e-mail existente (sem exigir confirmação extra) é uma decisão deliberada de conveniência — assume que o e-mail do provedor OAuth já é verificado (checado explicitamente antes de prosseguir).

## Publicação e resposta de formulários

Um formulário só é respondível publicamente depois de publicado; a publicação gera um `hash` opaco que substitui o `form_id` nas rotas públicas.

```mermaid
sequenceDiagram
    participant O as Owner (autenticado)
    participant R as Respondent (público)
    participant Pub as PublicationService
    participant Sub as SubmissionService
    participant DB as MariaDB

    O->>Pub: POST /forms/:form_id/publication
    Pub->>DB: cria FormPublication {hash, is_active: true}

    R->>Pub: GET /forms/publication/:hash
    Pub->>DB: busca por hash + is_active
    Pub-->>R: formulário público (respeitando FormConfig)

    R->>Sub: POST /forms/:form_id/submissions {answers}
    Sub->>DB: valida FormConfig (janela, max_responses, allow_anonymous, single_response_per_user)
    Sub->>DB: cria FormSubmission + FormSubmissionAnswer(s)
    Sub-->>R: 201 confirmação
```

A rota de criação de submissão não exige `JwtAuthGuard` — a autenticação é opcional e só relevante quando `allow_anonymous = false` ou `single_response_per_user = true`, validado dentro do `SubmissionService`, não no guard.

## Upload de imagens

Imagens não passam pela API — o cliente faz upload direto para o R2 usando uma URL pré-assinada, mantendo o binário fora do processo Node:

```mermaid
sequenceDiagram
    participant C as Client
    participant I as ImageController
    participant R2 as Cloudflare R2

    C->>I: POST /forms/:form_id/fields/:field_id/image {file_name, content_type, size}
    I->>I: registra/atualiza Image (upsert por field_id) e apaga a anterior no R2, se existir
    I->>R2: gera upload_url pré-assinada
    I-->>C: { image, upload_url }
    C->>R2: PUT upload_url (binário do arquivo)
    Note over C,R2: a partir daqui, GET .../image devolve uma download_url pré-assinada
```

Cada campo/seção tem no máximo uma imagem: um novo upload substitui (upsert) a anterior e remove o objeto antigo do bucket, evitando lixo órfão no R2.

## Geração de formulário via IA

O usuário cadastra sua própria credencial (API key) por provedor e ativa um único modelo; a geração usa essa credencial e essa configuração para transformar um prompt em um formulário completo:

```mermaid
sequenceDiagram
    participant C as Client
    participant F as FormController
    participant G as FormGenerationService
    participant P as Provider (OpenAI/Anthropic/Google/DeepSeek)
    participant DB as MariaDB

    C->>F: POST /forms/generate {prompt}
    F->>G: generateForm()
    G->>DB: busca UserAiModelConfig ativo + UserAiCredential do provedor
    alt sem modelo ativo ou sem credencial
        G-->>C: 400 Bad Request
    else configurado
        G->>G: descriptografa a API key (AES-256-GCM)
        G->>P: chama o modelo com prompt + schema esperado (título, seções, campos, opções)
        alt provedor falha
            G->>DB: AiUsageLog {status: error, error_message}
            G-->>C: exceção HTTP mapeada do erro do provedor
        else provedor responde
            G->>DB: cria Form + FormSection(s) + FormField(s) + FormFieldOption(s) em transação
            G->>DB: AiUsageLog {status: success, input/output tokens, custo estimado}
            G-->>C: 201 Form criado
        end
    end
```

Categorias e tipos de campo retornados pelo provedor são validados contra `FieldCategory`/`FieldType` antes de persistir — um valor não reconhecido derruba a geração inteira (`422 Unprocessable Entity`) em vez de criar um formulário parcialmente inconsistente.

## Decisões de arquitetura

- **Zod em vez de `class-validator`**: validação via `ZodBody`/`ZodQuery` (decorators customizados em `shared/decorators`), o que centraliza schema + tipo (`z.infer`) num único arquivo por DTO. Isso muda o formato de erro de validação: `ValidationErrorResponse` retorna `message` como objeto (`{ "campo": "mensagem" }`), não string — ver `docs/schemas/common.yaml`.

- **OpenAPI escrito à mão, modular**: o projeto não usa `@nestjs/swagger` (decorators nos controllers). A spec é YAML hand-authored, dividida por módulo (`docs/paths/<module>.yaml`, `docs/schemas/<module>.yaml`) e agregada via `$ref` em `docs/openapi.yaml`, resolvida em runtime por `SwaggerParser.bundle()` (`src/main.ts`). Trade-off aceito: mais trabalho manual, mas desacopla a documentação da implementação dos controllers e evita um arquivo único gigante.

- **Rate limiting escopado, não global**: `ThrottlerModule` está registrado globalmente, mas o guard só é aplicado (`@UseGuards(ThrottlerGuard)` + `@Throttle`) nas rotas sensíveis a força bruta/abuso (login, registro, forgot/reset password). Rotas de leitura comuns não pagam esse custo. Essa mudança foi intencional (ver commit `6d9ea3d`) após o guard estar acoplado globalmente.

- **Refresh token rotation com detecção de reuso**: cada refresh invalida o token anterior; se um token já usado for reapresentado, a sessão inteira é revogada (`SUSPICIOUS_TOKEN_REUSE`) em vez de apenas rejeitar a requisição — limita o dano de um refresh token vazado/roubado.

- **Presigned URLs para upload/download de imagem**: a API nunca lê/grava o binário — apenas gera credenciais temporárias de acesso ao R2. Reduz carga no processo Node e evita limites de tamanho de payload no Express.

- **Adaptador por provedor de IA (`AiProviderFactory`)**: cada provedor (OpenAI, Anthropic, Google, DeepSeek) implementa a mesma interface de geração; DeepSeek reaproveita o SDK `openai` via adaptador OpenAI-compatible. Erros de qualquer adaptador passam por `AiProviderErrorService`, que os normaliza em exceções HTTP consistentes antes de chegar ao client.

- **Uma credencial e um modelo ativo por usuário**: `UserAiCredential` é única por `(user_id, provider_id)` e `UserAiModelConfig.is_active` é controlado em código para garantir no máximo um modelo ativo por usuário — evita ambiguidade sobre qual credencial/modelo usar numa geração.
