# Contract: Workflow `deploy-pages.yml`

Arquivo: `.github/workflows/deploy-pages.yml`

## Gatilhos

| Evento | Condição | Requisito |
|---|---|---|
| `push` | branch `main` **e** alteração em `web/**` ou `.github/workflows/deploy-pages.yml` | FR-001, FR-003 |
| `workflow_dispatch` | sempre | FR-002 |

## Permissões

| Escopo | Permissões |
|---|---|
| workflow | `{}` (nenhuma) |
| job `build` | `contents: read` |
| job `deploy` | `pages: write`, `id-token: write` |

Nenhum `secrets.*` é referenciado (FR-012).

## Concorrência

`group: pages`, `cancel-in-progress: false` (FR-007).

## Job `build`

Diretório de trabalho: `web/`. Runtime: Node 22 com cache npm baseado em `web/package-lock.json`.

| Passo | Contrato | Falha ⇒ |
|---|---|---|
| Checkout | código do commit disparador | job falha |
| Instalação | `npm ci` (lockfile obrigatório — FR-004) | job falha |
| Testes do helper | `npm test` do `web/` | job falha |
| Build | `npm run build` com `VITE_BASE=/<repo>/` (FR-005) | job falha |
| Fallback | `dist/404.html` = `dist/index.html` (FR-009) | job falha |
| Verificação | `index.html` referencia `/<repo>/assets/`; `404.html` existe (SC-002) | job falha |
| Configurar Pages | `actions/configure-pages@v6` | job falha (indica Pages não habilitado) |
| Upload | `actions/upload-pages-artifact@v5` com `path: web/dist` | job falha |

## Job `deploy`

| Item | Contrato |
|---|---|
| Dependência | `needs: build` (FR-006) |
| Ambiente | `github-pages`, `url: ${{ steps.deployment.outputs.page_url }}` (FR-010) |
| Passo | `actions/deploy-pages@v5` |

## Saídas observáveis

- URL publicada no resumo da execução e no ambiente `github-pages`.
- Em falha: execução vermelha, nenhuma nova implantação no ambiente.
