# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- Autenticação de dois fatores (TOTP) e gerenciamento de e-mail de recuperação (`account`)
- Upload de imagens para campos e seções via URL pré-assinada (Cloudflare R2)
- Endpoint `GET /auth/me` para obtenção centralizada dos dados do usuário autenticado
- Exportação de respostas de formulário em CSV, enviada por e-mail
- Acesso público a formulários publicados, com suporte a submissões anônimas
- Filtros de busca/status e paginação na listagem de formulários e submissões
- Favoritar, clonar e mesclar seções/campos; reordenação por inserção
- Recuperação de senha via e-mail (Resend)
- Stack Docker: build multi-stage e `docker-compose` com migrações automáticas no boot
- Documentação OpenAPI completa para todos os módulos, servida via Swagger UI em `/docs`

### Fixed

- Rate limiting restrito às rotas sensíveis (login, registro, recuperação de senha) em vez do guard global
- Remoção de imagens órfãs no R2 ao excluir seção, campo ou formulário
- Ajustes de configuração de cookie/porta e migrações em produção

## [1.2.0] - 2026-03-29

### Added

- Login social via OAuth2 com GitHub

## [1.1.0] - 2026-03-20

### Added

- Login social via OAuth2 com Google

## [1.0.0] - 2026-03-13

### Added

- Fluxo inicial de autenticação: registro, login, refresh e logout com sessões JWT
