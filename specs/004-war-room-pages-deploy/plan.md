# Implementation Plan: Deploy da War Room Web no GitHub Pages

**Branch**: `004-war-room-pages-deploy` | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-war-room-pages-deploy/spec.md`

## Summary

Publicar a SPA `web/` no GitHub Pages por um workflow do GitHub Actions com dois jobs: `build` (instala com `npm ci`, gera `web/dist` com base pública derivada do nome do repositório, cria fallback `404.html`, verifica o artefato e o envia com `actions/upload-pages-artifact`) e `deploy` (publica com `actions/deploy-pages` no ambiente `github-pages`). A base pública passa a ser resolvida por uma função pura testada (`resolveBasePath`), mantendo `/opspilot/` como padrão da spec 003. Permissões mínimas são declaradas por job, publicações são serializadas, e o README documenta o fluxo.

Já existe uma implementação inicial (`.github/workflows/deploy-pages.yml`, `VITE_BASE` em `web/vite.config.ts`, seção no README). Este plano a revisa contra a spec; o delta está em [research.md](./research.md#delta-contra-a-implementação-inicial).

## Technical Context

**Language/Version**: TypeScript (strict) na SPA; YAML do GitHub Actions; Node.js 22 LTS no runner

**Primary Dependencies**: Vite + React (já existentes em `web/`); actions oficiais `actions/checkout@v7`, `actions/setup-node@v7`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`. Nenhuma dependência npm nova.

**Storage**: N/A (site estático; nenhum dado persistido)

**Testing**: `node:test` para a função pura de base pública (executado com type stripping nativo do Node, sem dependência nova); `npm run build` da SPA; verificação do artefato no próprio workflow (assets referenciam a base esperada, `404.html` presente)

**Target Platform**: GitHub Pages (HTTPS, `https://<owner>.github.io/<repo>/`); runner `ubuntu-latest`

**Project Type**: web-service (API Express) + SPA estática; esta feature afeta apenas a SPA e CI

**Performance Goals**: publicação visível em ≤ 5 min após o push (SC-001); build com cache de dependências npm

**Constraints**: permissões mínimas (FR-008); nenhum segredo (FR-012); não publicar build com falha (FR-006); base padrão `/opspilot/` preservada (spec 003)

**Scale/Scope**: 1 workflow, 1 helper puro + teste, ajustes em `vite.config.ts` e README

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|---|---|---|
| I. Camadas explícitas | Não toca `http → service → store`; a resolução da base é uma função pura isolada, usada apenas pela configuração de build. | ✅ |
| II. Validações na fronteira | A entrada externa (`VITE_BASE`) é normalizada/validada em um único ponto (`resolveBasePath`) antes de chegar ao Vite. Zod não é necessário para uma string de build; rejeitado por adicionar dependência à config. | ✅ |
| III. Erros de domínio | Sem domínio novo. Falhas de build/verificação encerram o job com código ≠ 0 e mensagem clara. | ✅ (N/A) |
| IV. Teste é parte da tarefa | `resolveBasePath` nasce com testes `node:test`; `npm test` e `npm run typecheck` da raiz seguem verdes; o workflow verifica o artefato antes de publicar. | ✅ |
| V. Segurança por padrão | Permissões por job (`contents: read` no build; `pages: write` + `id-token: write` só no deploy); sem segredos; actions oficiais em major fixo. | ✅ |
| VI. Spec antes de código | Spec 004 escrita e validada antes deste plano; a implementação inicial será reconciliada nas tasks. | ✅ |
| VII. Pequeno, um commit | Delta divisível em commits pequenos: helper+teste, workflow, README. | ✅ |
| Stack obrigatória | Node 22 no CI, TypeScript strict, `node:test`; nenhuma dependência extra. | ✅ |

**Resultado**: aprovado, sem violações. **Re-check pós-design (Phase 1)**: aprovado — o contrato do workflow e o helper não introduzem camadas, dependências ou segredos.

## Project Structure

### Documentation (this feature)

```text
specs/004-war-room-pages-deploy/
├── plan.md              # Este arquivo
├── research.md          # Phase 0: decisões e delta
├── data-model.md        # Phase 1: entidades de publicação
├── quickstart.md        # Phase 1: roteiro de validação ponta a ponta
├── contracts/
│   ├── deploy-workflow.md   # Contrato do workflow (gatilhos, jobs, permissões, saídas)
│   └── base-path.md         # Contrato de resolveBasePath / VITE_BASE
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit.tasks — não criado aqui)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── deploy-pages.yml      # build + deploy no GitHub Pages

web/
├── base-path.ts              # resolveBasePath(): função pura (novo)
├── base-path.test.ts         # testes node:test (novo)
├── vite.config.ts            # usa resolveBasePath(process.env.VITE_BASE)
└── package.json              # script "test" inclui os testes do helper

README.md                     # seção "Deploy no GitHub Pages" (revisada)
```

**Structure Decision**: o helper fica na raiz de `web/` (ao lado de `vite.config.ts`, que o consome em tempo de build) e não em `web/src/`, porque não faz parte do bundle da aplicação. O workflow vive em `.github/workflows/`, padrão do GitHub. Nenhuma mudança em `src/` (API).

## Complexity Tracking

Sem violações da constituição a justificar.
