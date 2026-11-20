# Data Model: Deploy da War Room Web no GitHub Pages

Esta feature não persiste dados. As "entidades" abaixo descrevem os objetos do fluxo de publicação e suas regras.

## Base pública (`BasePath`)

| Campo | Tipo | Regras |
|---|---|---|
| valor | string | Começa e termina com `/`; sem barras repetidas; sem esquema (`http:`), sem `..`, sem espaços. |
| origem | `"default"` \| `"env"` | `default` → `/opspilot/` (spec 003); `env` → `VITE_BASE`. |

Derivação no Pages: `/<nome-do-repositório>/`. Contrato completo em [contracts/base-path.md](./contracts/base-path.md).

## Artefato de publicação

| Campo | Regras |
|---|---|
| `index.html` | Referencia scripts/estilos sob a base pública. |
| `404.html` | Cópia idêntica de `index.html` (fallback de SPA). |
| `assets/*` | Arquivos com hash gerados pelo build. |
| Origem | Exatamente o commit que disparou a execução. |

Gerado somente pelo job `build`; consumido somente pelo job `deploy`.

## Execução de publicação (estados)

```text
queued ──► building ──► verified ──► deploying ──► published
              │             │             │
              └──► failed ◄─┴─────────────┘   (versão anterior permanece no ar)
```

- Transição para `deploying` exige `verified` (dependência `build → deploy`).
- No máximo uma execução em `deploying` por vez (grupo de concorrência `pages`, sem cancelamento).

## Ambiente de publicação (`github-pages`)

| Campo | Regras |
|---|---|
| URL | `https://<owner>.github.io/<repo>/`, exposta como saída do job `deploy` (FR-010). |
| Histórico | Uma implantação por execução bem-sucedida. |
