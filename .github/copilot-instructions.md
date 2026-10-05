# Copilot instructions

OpsPilot é um copiloto de plantão para gerenciar alertas e incidentes de produção. A aplicação usa um agente LangChain/LangGraph sobre OpenRouter.

## Stack
- Node.js 22 LTS
- TypeScript ESM com `strict` habilitado
- Zod somente na borda de entrada/saída (HTTP/CLI)
- Express + Sequelize/MySQL

## Regras
- Prefira código simples e explícito.
- Não misture validação de dados com lógica de negócio.
- Keep concerns separated: HTTP, domínio, infra, agentes.
- Use `process.env` via `.env` (não commitar segredos).
- Evite dependências extras sem necessidade.

## Convenções
- camadas não pulam: `http/cli -> service -> store`
- entrada externa validada com zod
- erros de domínio são classes traduzidas na borda
- lógica nova nasce com testes
- `typecheck` e `test` sempre verdes
- nunca commitar secrets nem ler `.env`

## Convenções
- camadas não pulam: `http/cli -> service -> store`
- entrada externa validada com zod
- erros de domínio são classes traduzidas na borda
- lógica nova nasce com testes
- `typecheck` e `test` sempre verdes
- nunca commitar secrets nem ler `.env`
- sempre utilize funções puras

## Fluxo
speckit.specify -> plan -> task -> implement. Specs devem ser versionadas.

## Comandos
- `npm run dev`
- `npm run arena`
- `npm run bench`
- `npm run test`
- `npm run typecheck`
