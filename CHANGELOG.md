# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

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
