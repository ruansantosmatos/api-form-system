# Contribuindo

Guia rápido de convenções usadas neste repositório. O objetivo é manter o histórico do Git legível e o processo de PR previsível.

## Branches

Nomeie branches como `<tipo>/<descrição-curta>`, a partir de `develop`:

| Prefixo   | Uso                                            |
| --------- | ---------------------------------------------- |
| `feat/`   | Nova funcionalidade                            |
| `fix/`    | Correção de bug                                |
| `hotfix/` | Correção urgente, direto sobre `main`/produção |
| `docs/`   | Documentação (README, OpenAPI, ARCHITECTURE)   |
| `ci/`     | Docker, pipelines, configuração de build       |

Exemplos reais do histórico: `feat/auth-otp`, `fix/auth-flow`, `hotfix/rate-limit`, `docs/swagger-api-documentation`.

Fluxo de merge do repositório: `feat/* | fix/* | docs/* | ci/*` → `develop` → `main`, sempre via Pull Request (sem push direto).

## Commits

Formato: `<emoji> <tipo>(<escopo opcional>): <descrição no imperativo>`

| Emoji | Tipo       | Quando usar                                                            |
| ----- | ---------- | ---------------------------------------------------------------------- |
| 🆕    | `feat`     | Nova funcionalidade ou endpoint                                        |
| 🐛    | `fix`      | Correção de bug                                                        |
| 🔧    | `refactor` | Mudança de estrutura interna sem alterar comportamento externo         |
| 📝    | `docs`     | Documentação (README, OpenAPI, comentários)                            |
| 🐳    | `build`    | Docker, dependências, build                                            |
| ⚙️    | `chore`    | Configuração de projeto, setup inicial, tarefas de manutenção          |
| 🔀    | —          | Reservado para commits de merge (gerados pelo GitHub ao aceitar um PR) |

Exemplos:

```
🆕 feat(account,auth): add two-factor authentication (TOTP) and recovery email management
🐛 fix(auth,account): scope rate limiting to sensitive routes instead of global guard
🔧 refactor(auth): add return types, OAuth URL constants, and structured session responses
📝 docs(api): add OpenAPI documentation for all modules
```

O escopo entre parênteses é o(s) módulo(s) afetado(s) (`auth`, `form`, `section`, `field`, `image`, `submission`, `publication`, `account`, `docs`, `docker`...). Múltiplos módulos são separados por vírgula, sem espaço.

## Antes de abrir um Pull Request

```bash
npm run lint
npm run test
npm run test:e2e   # se a mudança envolve fluxo completo (auth, publicação, submissão)
```

Se a mudança adiciona ou altera uma rota:

1. Atualize `docs/paths/<module>.yaml` e `docs/schemas/<module>.yaml` (nunca inline no `docs/openapi.yaml` raiz).
2. Valide a spec:
   ```bash
   node -e "require('@apidevtools/swagger-parser').validate('docs/openapi.yaml').then(() => console.log('ok'))"
   ```
3. Confirme que a rota pública (sem autenticação) define `security: []` explicitamente no YAML, caso não exija login.

Se a mudança afeta um fluxo descrito na seção [🏗️ Arquitetura](README.md#️-arquitetura) do README (autenticação, sessões, publicação, upload), atualize o diagrama correspondente.

## Pull Requests

- Título curto no mesmo padrão dos commits (`🆕 feat(form): ...`)
- Descreva o _porquê_ da mudança, não só o _o quê_ — o diff já mostra o que mudou
- PRs de `hotfix/*` podem ir direto para `main`; os demais passam por `develop`
