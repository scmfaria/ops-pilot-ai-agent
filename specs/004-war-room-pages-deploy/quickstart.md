# Quickstart: validar o deploy da War Room no GitHub Pages

## Pré-requisitos

- Node.js 22.18+ local; dependências instaladas (`npm --prefix web ci`).
- Acesso de administração ao repositório no GitHub.
- Uma única vez: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## 1. Validação local

```bash
npm --prefix web test                                   # tipos + testes de resolveBasePath
npm --prefix web run build                              # base padrão
grep -o 'src="/opspilot/assets/[^"]*"' web/dist/index.html          # esperado: 1 ocorrência
VITE_BASE=/ops-pilot-ai-agent/ npm --prefix web run build
grep -o 'src="/ops-pilot-ai-agent/assets/[^"]*"' web/dist/index.html # esperado: 1 ocorrência
VITE_BASE=https://x.com/ npm --prefix web run build                  # esperado: falha citando VITE_BASE
npm test && npm run typecheck                                        # raiz continua verde
```

## 2. Publicação automática (US1)

1. Faça uma alteração visível em `web/` e integre na `main`.
2. Em **Actions → Deploy War Room (GitHub Pages)**: `build` e `deploy` verdes em ≤ 5 min.
3. Abra a URL do ambiente `github-pages` (`https://scmfaria.github.io/ops-pilot-ai-agent/`): a alteração aparece; DevTools → Network sem 404.
4. Abra `https://scmfaria.github.io/ops-pilot-ai-agent/qualquer/caminho`: a War Room carrega (fallback).

## 3. Não disparo (US1, cenário 2)

Integre uma mudança só em `src/` → nenhuma execução nova do workflow.

## 4. Disparo manual (US2)

**Actions → Deploy War Room → Run workflow** na `main` → nova implantação no ambiente.

## 5. Segurança e falha (US3)

1. Em uma branch, quebre os tipos em `web/src/` e rode o workflow manualmente nessa branch (ou integre num fork): `build` falha, `deploy` não roda, a página anterior continua no ar.
2. Revise o YAML: permissões conforme [contracts/deploy-workflow.md](./contracts/deploy-workflow.md#permissões); nenhuma referência a `secrets.`.
3. Integre dois commits seguidos em `web/`: as execuções rodam em sequência; a página final reflete o segundo.

## 6. Uso com a API (US4)

```bash
OPSPILOT_CORS_ORIGINS=https://scmfaria.github.io npm run dev
```

Na página publicada, engrenagem → URL `http://localhost:3000` → enviar uma mensagem → resposta exibida.
