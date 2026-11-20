---

description: "Task list for feature 004 — deploy da War Room Web no GitHub Pages"
---

# Tasks: Deploy da War Room Web no GitHub Pages

**Input**: Design documents from `/specs/004-war-room-pages-deploy/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/deploy-workflow.md, contracts/base-path.md, quickstart.md

**Tests**: Incluídos para `resolveBasePath` — a constituição (princípio IV) exige teste para toda lógica nova. O workflow é validado pelo passo de verificação do artefato e pelo [quickstart.md](./quickstart.md).

**Organization**: Tarefas agrupadas por história de usuário. Itens já `[x]` foram entregues pela implementação inicial e conferidos contra a spec em [research.md](./research.md#delta-contra-a-implementação-inicial).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: História da spec (US1–US4)

## Path Conventions

- Workflow: `.github/workflows/deploy-pages.yml`
- SPA: `web/` (helper de build na raiz de `web/`, fora de `web/src/`)
- Documentação: `README.md`

---

## Phase 1: Setup

**Purpose**: Pré-condições do repositório e do workflow.

- [x] T001 Criar `.github/workflows/deploy-pages.yml` com nome `Deploy War Room (GitHub Pages)` e jobs `build` e `deploy`.
- [ ] T002 Habilitar no GitHub **Settings → Pages → Build and deployment → Source: GitHub Actions** (ação manual da mantenedora; registrar no README em T024).

---

## Phase 2: Foundational (base pública)

**Purpose**: Resolver a base pública de forma testada — bloqueia US1, pois sem a base correta todos os assets publicados quebram.

**⚠️ CRITICAL**: Concluir antes da Phase 3.

### Tests

- [x] T003 [P] Criar `web/base-path.test.ts` com `node:test` cobrindo a tabela de [contracts/base-path.md](./contracts/base-path.md): `undefined`/`""`/espaços → `/opspilot/`; `"ops-pilot-ai-agent"` e `"/ops-pilot-ai-agent/"` → `/ops-pilot-ai-agent/`; `" /a/b "` → `/a/b/`; `"//a///b//"` → `/a/b/`; `"/"` → `/`; `"https://x.com/a/"`, `"/a/../b/"` e `"/a b/"` lançam `Error` cuja mensagem cita `VITE_BASE` e o valor recebido. Confirmar que falham antes de T004.

### Implementation

- [x] T004 Criar `web/base-path.ts` exportando `DEFAULT_BASE_PATH = "/opspilot/"` e `resolveBasePath(raw: string | undefined): string` — função pura, sem I/O, usando apenas sintaxe TypeScript apagável (compatível com type stripping do Node); regras: "Começa e termina com `/`; sem barras repetidas; sem esquema (`http:`), sem `..`, sem espaços."
- [x] T005 Substituir o ternário inline em `web/vite.config.ts` por `base: resolveBasePath(process.env.VITE_BASE)` importando de `./base-path`.
- [x] T006 Incluir `web/base-path.ts` no projeto TypeScript de config (`web/tsconfig.node.json`, campo `include`) para que `tsc -b` o verifique.
- [x] T007 Atualizar o script `test` em `web/package.json` para `tsc -b --pretty false && node --test base-path.test.ts`.
- [x] T008 Rodar `npm --prefix web test` e os builds com e sem `VITE_BASE` da seção 1 do [quickstart.md](./quickstart.md); confirmar que `VITE_BASE=https://x.com/` falha citando `VITE_BASE`.

**Checkpoint**: base pública validada e testada; `npm test` e `npm run typecheck` da raiz seguem verdes.

---

## Phase 3: User Story 1 — Publicação automática a cada mudança (Priority: P1) 🎯 MVP

**Goal**: Push na `main` que altere `web/**` publica a War Room automaticamente, com assets carregando.

**Independent Test**: Seções 2 e 3 do [quickstart.md](./quickstart.md) — alteração em `web/` aparece na URL pública em ≤ 5 min; alteração só em `src/` não dispara o workflow.

- [x] T009 [US1] Configurar gatilho `push` em `main` com `paths: ["web/**", ".github/workflows/deploy-pages.yml"]` em `.github/workflows/deploy-pages.yml` (FR-001, FR-003).
- [x] T010 [US1] Atualizar as actions do job `build` em `.github/workflows/deploy-pages.yml` para `actions/checkout@v7`, `actions/setup-node@v7` (Node 22, `cache: npm`, `cache-dependency-path: web/package-lock.json`), `actions/configure-pages@v6` e `actions/upload-pages-artifact@v5` com `path: web/dist`.
- [x] T011 [US1] Instalar com `npm ci` e construir com `npm run build` usando `VITE_BASE: /${{ github.event.repository.name }}/` em `.github/workflows/deploy-pages.yml` (FR-004, FR-005).
- [x] T012 [US1] Adicionar passo `npm test` (de `web/`) antes do build em `.github/workflows/deploy-pages.yml`.
- [x] T013 [US1] Copiar `dist/index.html` para `dist/404.html` após o build em `.github/workflows/deploy-pages.yml` (FR-009).
- [x] T014 [US1] Atualizar o job `deploy` para `actions/deploy-pages@v5`, mantendo `needs: build`, ambiente `github-pages` e `url: ${{ steps.deployment.outputs.page_url }}` em `.github/workflows/deploy-pages.yml` (FR-010).
- [ ] T015 [US1] Integrar na `main` e validar seções 2 e 3 do [quickstart.md](./quickstart.md) (URL pública, Network sem 404, fallback em caminho inexistente, não disparo por mudança em `src/`).

**Checkpoint**: MVP — War Room pública e atualizada automaticamente.

---

## Phase 4: User Story 2 — Publicação manual (Priority: P2)

**Goal**: Republicar sem commit.

**Independent Test**: Seção 4 do [quickstart.md](./quickstart.md).

- [x] T016 [US2] Declarar `workflow_dispatch` em `.github/workflows/deploy-pages.yml` (FR-002).
- [ ] T017 [US2] Disparar manualmente pela aba Actions e confirmar nova implantação no ambiente `github-pages`.

---

## Phase 5: User Story 3 — Publicação segura e previsível (Priority: P2)

**Goal**: Mínimo privilégio, nada publicado com falha, publicações serializadas.

**Independent Test**: Seção 5 do [quickstart.md](./quickstart.md).

- [x] T018 [US3] Em `.github/workflows/deploy-pages.yml`, trocar as permissões globais por `permissions: {}` no workflow, `contents: read` no job `build` e `pages: write` + `id-token: write` no job `deploy` (FR-008).
- [x] T019 [US3] Manter `concurrency: { group: pages, cancel-in-progress: false }` em `.github/workflows/deploy-pages.yml` (FR-007).
- [x] T020 [US3] Adicionar passo `Verify artifact` no job `build`, após o fallback, em `.github/workflows/deploy-pages.yml`: falhar se `dist/index.html` não contiver `/${{ github.event.repository.name }}/assets/` ou se `dist/404.html` não existir (SC-002, FR-006).
- [x] T021 [US3] Confirmar que `.github/workflows/deploy-pages.yml` não referencia `secrets.` nem embute URL/credencial da API (FR-012).
- [ ] T022 [US3] Validar seção 5 do [quickstart.md](./quickstart.md): build quebrado não publica; duas integrações seguidas publicam em sequência.

---

## Phase 6: User Story 4 — Documentação (Priority: P3)

**Goal**: README suficiente para reproduzir o deploy num fork e usar a página publicada com a API.

**Independent Test**: Seção 6 do [quickstart.md](./quickstart.md) e leitura do README por alguém sem contexto.

- [x] T023 [P] [US4] Atualizar em `README.md` o bloco de permissões da seção "Deploy no GitHub Pages" para o formato por job (build: `contents: read`; deploy: `pages: write`, `id-token: write`) com o motivo de cada uma.
- [x] T024 [P] [US4] Documentar em `README.md`: passo de verificação do artefato, `resolveBasePath`/`VITE_BASE` (valores aceitos e erro para valores inválidos), uso em fork (base derivada do nome do repo) e o passo único de habilitar Pages (T002).
- [x] T025 [US4] Documentar em `README.md` a liberação de `https://<owner>.github.io` em `OPSPILOT_CORS_ORIGINS` e a restrição de conteúdo misto HTTPS→HTTP.

---

## Phase 7: Polish & Cross-Cutting

- [x] T026 Rodar `npm test` e `npm run typecheck` na raiz e `npm --prefix web test` / `npm --prefix web run build`; tudo verde.
- [x] T027 [P] Atualizar `specs/003-ops-pilot-war-room-web/tasks.md` T003 com nota de que a base é sobrescrevível via `VITE_BASE` (spec 004), sem mudar o padrão `/opspilot/`.
- [x] T028 Revisar `.github/workflows/deploy-pages.yml` contra [contracts/deploy-workflow.md](./contracts/deploy-workflow.md) item a item.

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** (T003 → T004 → T005/T006/T007 → T008) → **US1**.
- **US1 (P1)** depende de Phase 2. T010–T014 editam o mesmo arquivo: sequenciais.
- **US2** depende apenas de T001; validação (T017) após US1 publicado.
- **US3** edita o mesmo workflow que US1 → executar após T014 para evitar conflito; T022 depende de T018 e T020.
- **US4** independente de código; T023/T024 após T018/T020 para refletir o estado final.
- **Polish** por último.

```text
T001 ─► T003 ─► T004 ─► {T005,T006,T007} ─► T008 ─► T010 ─► T012 ─► T014 ─► T015 (MVP)
                                                              └─► T018 ─► T020 ─► T021 ─► T022
                                                                          └─► {T023,T024} ─► T026 ─► T028
```

## Parallel Opportunities

- Phase 2: T003 (teste) em paralelo com a leitura do contrato; T006 e T007 em paralelo após T004 (arquivos diferentes).
- US4: T023 e T024 são o mesmo arquivo — paralelos apenas entre pessoas com merge cuidadoso; T027 paralelo a qualquer tarefa.
- Workflow (US1/US2/US3) é um único arquivo: sem paralelismo real.

## Implementation Strategy

### MVP (US1)

1. Phase 2 (base pública testada).
2. T010–T014 no workflow.
3. Integrar na `main` e validar (T015). **Parar e validar.**

### Incremental

1. US3 (permissões por job + verificação do artefato) — maior ganho de segurança.
2. US2 (já declarado; só validar).
3. US4 (README).
4. Polish.

### Commits sugeridos (princípio VII)

1. `feat(web): resolveBasePath com testes` — T003–T008
2. `ci: atualiza actions do deploy do Pages` — T010, T012, T014
3. `ci: permissões por job e verificação do artefato` — T018, T020
4. `docs: README do deploy no Pages` — T023, T024, T027
