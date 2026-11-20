# Research: Deploy da War Room Web no GitHub Pages

## 1. Mecanismo de publicação

- **Decision**: GitHub Pages com "Source: GitHub Actions", usando `actions/configure-pages`, `actions/upload-pages-artifact` e `actions/deploy-pages`.
- **Rationale**: é o fluxo oficial; não exige branch `gh-pages`, nem token com escrita no repositório, e registra cada publicação no ambiente `github-pages` com URL.
- **Alternatives considered**: branch `gh-pages` via `peaceiris/actions-gh-pages` (exige `contents: write` e commits de build no repo — viola o mínimo privilégio); hospedagem externa (Netlify/Vercel — fora do pedido e exige segredos).

## 2. Versões das actions

- **Decision**: fixar no major mais recente publicado (verificado em 2026-11-20): `actions/checkout@v7`, `actions/setup-node@v7`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.
- **Rationale**: majors antigos (`@v3`/`@v4`) usados na implementação inicial podem depender de runtimes Node depreciados no runner e de versões antigas de `upload-artifact`, já removidas em alguns casos. `upload-pages-artifact` e `deploy-pages` devem andar em majors compatíveis.
- **Alternatives considered**: pin por SHA (mais seguro contra supply chain, mas pesado para um projeto acadêmico; pode ser adotado depois com Dependabot); manter majors antigos (risco de quebra).

## 3. Base pública no Pages

- **Decision**: a base é resolvida por `resolveBasePath(VITE_BASE)`; ausente/vazia → `/opspilot/`; o workflow passa `VITE_BASE=/${{ github.event.repository.name }}/`.
- **Rationale**: o Pages de projeto serve em `/<repo>/`; com `/opspilot/` todos os assets dariam 404. Derivar do nome do repositório faz forks funcionarem sem editar o workflow (edge case da spec). Manter o padrão preserva a spec 003.
- **Alternatives considered**: base relativa `./` (quebra rotas aninhadas e o `404.html` servido em outros caminhos); renomear o repo para `opspilot` (acopla o código ao nome do repo); usar `actions/configure-pages` output `base_path` (equivalente, mas depende de o Pages já estar habilitado no passo de build — mantido como opção, não necessária).
- **Normalização** (contrato em [contracts/base-path.md](./contracts/base-path.md)): garantir `/` inicial e final, colapsar barras repetidas, rejeitar valores com esquema (`http:`), `..` ou espaços com erro explícito, para não gerar um build silenciosamente quebrado.

## 4. Fallback de SPA

- **Decision**: copiar `dist/index.html` para `dist/404.html` após o build.
- **Rationale**: o Pages entrega `404.html` para qualquer caminho inexistente; como a SPA não tem roteamento por caminho hoje, isso garante que recarregar um subcaminho mostre a aplicação (FR-009) em vez da página genérica.
- **Alternatives considered**: hash routing (não há router hoje — desnecessário); script de redirect `spa-github-pages` (complexidade sem ganho atual).

## 5. Gatilhos e concorrência

- **Decision**: `push` na `main` com `paths: [web/**, .github/workflows/deploy-pages.yml]` + `workflow_dispatch`; `concurrency: { group: pages, cancel-in-progress: false }`.
- **Rationale**: atende FR-001/002/003; não cancelar evita deixar o ambiente em publicação parcial (FR-007), e o grupo único serializa as execuções — a última a rodar publica a integração mais recente.
- **Alternatives considered**: `cancel-in-progress: true` (pode interromper um deploy em andamento).

## 6. Permissões

- **Decision**: `permissions: {}` no nível do workflow; `build` com `contents: read`; `deploy` com `pages: write` e `id-token: write`.
- **Rationale**: mínimo privilégio por job (FR-008, princípio V); o build nunca recebe permissão de publicação, e o deploy não lê código.
- **Alternatives considered**: permissões no nível do workflow (implementação inicial) — funcional, mas concede `pages: write`/`id-token: write` também ao job que executa código de terceiros (dependências npm).

## 7. Verificação antes de publicar

- **Decision**: passo no job `build` que falha se `dist/index.html` não referenciar assets sob a base esperada ou se `dist/404.html` não existir; o `npm run build` já roda `tsc -b` (falha de tipos impede publicação).
- **Rationale**: transforma SC-002 ("nenhum recurso quebrado") em gate automático; como `deploy` depende de `build` (`needs`), qualquer falha mantém a versão anterior (FR-006).
- **Alternatives considered**: smoke test HTTP após o deploy (útil, mas só detecta depois de publicar; pode ser adicionado como melhoria).

## 8. Testes do helper sem dependência nova

- **Decision**: `web/base-path.test.ts` com `node:test`, executado por `node --test base-path.test.ts` (type stripping nativo, Node ≥ 22.18). O helper usa apenas sintaxe TypeScript apagável.
- **Rationale**: cumpre o princípio IV sem adicionar Vitest/tsx ao `web/` antes de a spec 003 escolher seu runner de UI.
- **Alternatives considered**: Vitest (a spec 003 provavelmente adotará; quando isso ocorrer o teste pode migrar); testar pela suíte da raiz (`src/**/*.test.ts` — mistura API e SPA).

## Delta contra a implementação inicial

| Item | Estado atual | Ação |
|---|---|---|
| Majors das actions | `checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4` | Atualizar para v7/v7/v6/v5/v5 |
| Permissões | nível do workflow | Mover para nível de job; `permissions: {}` global |
| Base pública | ternário inline em `vite.config.ts` | Extrair `resolveBasePath` + testes; validar entrada |
| Verificação do artefato | inexistente | Adicionar passo de verificação no `build` |
| Script de teste do `web/` | só `tsc -b` | Incluir `node --test base-path.test.ts` |
| Gatilhos, concorrência, fallback 404, `page_url` | conforme spec | Manter |
| README | seção de deploy existente | Ajustar permissões por job e versões; manter resto |
