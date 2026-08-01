# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Removed

- Módulo `ai` por completo: rotas `GET /ai/providers`, `GET /ai/credentials`, `PUT|DELETE /ai/providers/{provider_id}/credential`, `GET|DELETE /ai/models/active`, `POST /ai/models/{model_id}/activate` e `GET|PATCH /ai/models/{model_id}/config`
- Endpoint `POST /forms/generate` e a geração de formulário a partir de prompt
- Tabelas `ai_providers`, `ai_models`, `user_ai_credentials`, `user_ai_model_configs` e `ai_usage_logs`, e a coluna `has_ai_access` de `account_settings` (removida também da resposta de `GET /account/settings`)
- Seed de provedores e modelos de IA, e as dependências `@anthropic-ai/sdk`, `@google/genai` e `openai`

## [1.3.1] - 2026-07-29

### Added

- Novo módulo `ai`: catálogo de provedores (OpenAI, Anthropic, Google e DeepSeek) com seus modelos, cadastro/remoção de credenciais (API key) por provedor, ativação de um único modelo por usuário e configuração de parâmetros de geração (`temperature`, `top_p`, `max_output_tokens`, `presence_penalty`, `frequency_penalty`, prompt de sistema adicional)
- Endpoint `POST /forms/generate`: gera um formulário completo (título, descrição, seções, campos e opções) a partir de um prompt em linguagem natural, usando o modelo de IA ativo do usuário
- Criptografia AES-256-GCM para as chaves de API armazenadas (`UserAiCredential`), descriptografadas apenas no momento do uso
- Registro de uso por chamada de IA (tokens de entrada/saída e custo estimado por milhão de tokens) e log de erros de provedor (`AiUsageLog`)
- Flag `has_ai_access` em `AccountSettings`, sincronizada automaticamente conforme o usuário possui um modelo de IA ativo

### Changed

- Services de `auth`, `account`, `form`, `field`, `image`, `publication`, `section` e `submission` reorganizados por responsabilidade (ex.: `auth` dividido em password/oauth/session; `submission` em query/export), sem alteração de contrato público das rotas
- Tratamento de erros de provedores de IA padronizado, convertendo falhas de API externas em respostas HTTP consistentes
- Documentação OpenAPI atualizada com o módulo `ai` e os schemas/params afetados pela reorganização de services

## [1.0.0] - 2026-07-23

### Added

- Fluxo inicial de autenticação: registro, login, refresh e logout com sessões JWT
- Login social via OAuth2 (Google e GitHub)
- Autenticação de dois fatores (TOTP) e gerenciamento de e-mail de recuperação (`account`)
- Recuperação de senha via e-mail (Resend)
- Endpoint `GET /auth/me` para obtenção centralizada dos dados do usuário autenticado
- Favoritar, clonar e mesclar seções/campos; reordenação por inserção
- Upload de imagens para campos e seções via URL pré-assinada (Cloudflare R2)
- Acesso público a formulários publicados, com suporte a submissões anônimas
- Exportação de respostas de formulário em CSV, enviada por e-mail
- Filtros de busca/status e paginação na listagem de formulários e submissões
- Documentação OpenAPI completa para todos os módulos, servida via Swagger UI em `/docs`
- Stack Docker: build multi-stage e `docker-compose` com migrações automáticas no boot

### Fixed

- Rate limiting restrito às rotas sensíveis (login, registro, recuperação de senha) em vez do guard global
- Remoção de imagens órfãs no R2 ao excluir seção, campo ou formulário
- Ajustes de configuração de cookie/porta e migrações em produção
