# form-system-api

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-8.4-003545?logo=mariadb&logoColor=white)
![License](https://img.shields.io/badge/license-Apache%202.0-blue)
[![Production](https://img.shields.io/badge/production-online-brightgreen)](https://formsystemapp.com)

API REST para criação de formulários dinâmicos — do desenho do formulário à análise das respostas. Um usuário monta seções e campos, publica o formulário através de um link público e acompanha as respostas recebidas, com exportação em CSV.

**🔗 Aplicação em produção:** [formsystemapp.com](https://formsystemapp.com)

Principais capacidades:

- **Formulários dinâmicos** — seções, campos tipados (texto, opções, etc.), reordenação, clonagem e mesclagem de seções

- **Publicação pública** — cada formulário publicado ganha um link único, respeitando regras de disponibilidade, limite de respostas e respostas anônimas

- **Coleta e exportação de respostas** — submissões versionáveis por respondente e exportação em CSV enviada por e-mail

- **Autenticação completa** — sessões JWT rotativas, login social (Google/GitHub) e autenticação de dois fatores (TOTP)

- **Upload de imagens** — anexadas a campos ou seções via URL pré-assinada (Cloudflare R2), sem passar pela API

## 📑 Sumário

- [🧰 Stack tecnológica](#-stack-tecnológica)
- [✨ Destaques técnicos](#-destaques-técnicos)
- [🚀 Como rodar o projeto](#-como-rodar-o-projeto)
- [⚙️ Variáveis de ambiente](#️-variáveis-de-ambiente)
- [📖 Documentação da API](#-documentação-da-api)
- [🏗️ Arquitetura](#️-arquitetura)
- [📜 Scripts disponíveis](#-scripts-disponíveis)
- [🤝 Contribuindo](#-contribuindo)
- [📄 Licença](#-licença)

## 🧰 Stack tecnológica

| Camada                    | Tecnologia                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- |
| Framework                 | NestJS 11 (Express)                                                           |
| Linguagem                 | TypeScript                                                                    |
| Banco de dados            | MariaDB / MySQL, via Prisma ORM                                               |
| Validação                 | Zod (pipe customizado, não usa `class-validator`)                             |
| Autenticação              | JWT (access + refresh) em cookie httpOnly, OAuth2 (Google/GitHub), TOTP (2FA) |
| Armazenamento de arquivos | Cloudflare R2 (S3-compatible), via URLs pré-assinadas                         |
| E-mail                    | Resend                                                                        |
| Criptografia de segredos  | AES-256-GCM (Node `crypto`), aplicada aos segredos de 2FA (TOTP) armazenados  |
| Rate limiting             | `@nestjs/throttler`, escopado nas rotas sensíveis                             |
| Documentação da API       | OpenAPI 3 (YAML manual, modular) + Swagger UI                                 |
| Containerização           | Docker multi-stage + docker-compose                                           |

## ✨ Destaques técnicos

- **Refresh token rotation com detecção de reuso** — cada `/auth/refresh` invalida o token anterior; se um token já usado for reapresentado, a sessão inteira é revogada (`SUSPICIOUS_TOKEN_REUSE`) em vez de só rejeitar a requisição, limitando o dano de um refresh token vazado. Ver [detalhes](ARCHITECTURE.md#sessões-refresh-e-rotação-de-tokens).

- **Presigned URLs para upload/download de imagem** — o binário nunca passa pela API: o cliente envia direto para o Cloudflare R2 usando uma URL pré-assinada, sem consumir memória/tempo do processo Node. Ver [detalhes](ARCHITECTURE.md#upload-de-imagens).

- **Zod no lugar de `class-validator`** — validação via decorators customizados (`ZodBody`/`ZodQuery`) que centralizam schema e tipo (`z.infer`) num único arquivo por DTO. Ver [detalhes](ARCHITECTURE.md#decisões-de-arquitetura).

- **OpenAPI escrito à mão, modular** — sem `@nestjs/swagger`; a spec YAML é dividida por módulo (`docs/paths/`, `docs/schemas/`) e agregada por `$ref`, desacoplando a documentação da implementação dos controllers. Ver [detalhes](ARCHITECTURE.md#decisões-de-arquitetura).

- **Rate limiting escopado, não global** — o `ThrottlerGuard` só é aplicado nas rotas sensíveis a força bruta (login, registro, reset de senha), poupando as rotas de leitura comuns desse custo. Ver [detalhes](ARCHITECTURE.md#decisões-de-arquitetura).

- **Segredos de 2FA cifrados em repouso** — o segredo TOTP de cada usuário é cifrado com AES-256-GCM antes de ser persistido e só é descriptografado em memória no momento da validação de um código.

O mapa de módulos está na seção [🏗️ Arquitetura](#️-arquitetura) abaixo. O modelo de dados completo e os diagramas de cada fluxo (autenticação, publicação, submissão) estão em [ARCHITECTURE.md](ARCHITECTURE.md).

## 🚀 Como rodar o projeto

### Pré-requisitos

- Node.js 22+
- Docker e Docker Compose (recomendado) **ou** uma instância MariaDB/MySQL local

### Passo a passo (com Docker)

```bash
# 1. Clone o repositório
git clone <repo-url>
cd api-form-system

# 2. Copie o arquivo de exemplo e preencha as variáveis
cp .example-env .env

# 3. Suba a API e o banco de dados
docker compose up --build
```

O container da API já roda `prisma migrate deploy` automaticamente antes de subir (ver `Dockerfile`).

### Passo a passo (ambiente local, sem Docker)

```bash
npm install
cp .example-env .env   # aponte DATABASE_URL para seu banco local
npx prisma migrate dev
npm run start:dev
```

A API sobe em `http://localhost:${PORT}` (padrão `3001`).

## ⚙️ Variáveis de ambiente

Todas as variáveis estão listadas em [.example-env](.example-env). Principais grupos:

| Grupo          | Variáveis                                                                                               | Descrição                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| App            | `NODE_ENV`, `PORT`, `APP_NAME`, `CLIENT_URL`, `CORS_ORIGINS`, `COOKIE_DOMAIN`                           | Configuração geral e CORS/cookies                                    |
| Banco de dados | `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | Conexão MariaDB via Prisma                                           |
| Autenticação   | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `APP_ENCRYPTION_KEY`    | Assinatura de tokens e criptografia de segredos (2FA)                |
| OAuth          | `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL`, `GITHUB_CLIENT_ID/SECRET/CALLBACK_URL`                          | Login social                                                         |
| E-mail         | `RESEND_API_KEY`, `MAIL_FROM`                                                                           | Envio de e-mails transacionais (reset de senha, export de respostas) |
| Armazenamento  | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_API_TOKEN`, `R2_BUCKET`                | Upload de imagens via Cloudflare R2                                  |

## 📖 Documentação da API

A referência completa de rotas, payloads, respostas e erros de validação é gerada a partir da spec OpenAPI 3 modular (`docs/openapi.yaml`, agregando `docs/paths/` e `docs/schemas/` por módulo) e servida via Swagger UI:

```
GET /docs
```

Em produção, `/docs` fica protegido por Basic Auth. A spec OpenAPI é a fonte de verdade para o contrato de endpoints — evite duplicar essa documentação aqui no README.

## 🏗️ Arquitetura

Cada domínio é um módulo Nest independente em `src/<module>`, seguindo sempre `controller → service → Prisma`.

| Módulo | Responsabilidade |
|---|---|
| `auth` | Login/registro por senha, sessões, OAuth (Google/GitHub), recuperação de senha, desafio de 2FA no login |
| `account` | Configurações de segurança da conta já autenticada: e-mail de recuperação, ativação/desativação de 2FA (TOTP) |
| `form` | CRUD de formulários e sua configuração (`FormConfig`: janela de disponibilidade, limite de respostas, etc.) |
| `section` | Seções de um formulário (agrupam campos) |
| `field` | Campos (perguntas) de um formulário/seção e suas opções |
| `image` | Upload de imagem para campo ou seção via URL pré-assinada (R2) |
| `publication` | Publica um formulário (gera hash público) e expõe a versão pública para resposta |
| `submission` | Recebe respostas de um formulário publicado e exporta respostas em CSV por e-mail |
| `shared` | Guards, decorators, services (Prisma, e-mail, R2, tokens, 2FA, criptografia AES-256-GCM) e utils reaproveitados por todos os módulos acima |

Modelo de dados (diagrama ER), diagramas de sequência de cada fluxo (autenticação, sessões/refresh, OAuth, publicação/submissão, upload de imagens) e as decisões de arquitetura por trás deles estão documentados em **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## 📜 Scripts disponíveis

| Script               | Descrição                                           |
| -------------------- | --------------------------------------------------- |
| `npm run start:dev`  | Sobe a API em modo watch                            |
| `npm run build`      | Compila para `dist/`                                |
| `npm run start:prod` | Roda o build de produção (`dist/main`)              |
| `npm run lint`       | ESLint com `--fix`                                  |
| `npm run format`     | Formata `src`, `prisma/seeds` e `test` com Prettier |
| `npm run test`       | Testes unitários (Jest)                             |
| `npm run test:e2e`   | Testes end-to-end                                   |
| `npm run test:cov`   | Testes com relatório de cobertura                   |

## 🤝 Contribuindo

Convenções de branch, commit e checklist de Pull Request estão em [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 Licença

Distribuído sob a licença [Apache 2.0](LICENSE).
