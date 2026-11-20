# OpsPilot

OpsPilot é um copiloto de plantão para análise e gerenciamento de alertas e incidentes em produção. Ele combina LangChain/LangGraph, agentes de raciocínio e uma base operacional persistente para responder perguntas, consultar serviços e executar ações simuladas de incident management.

O projeto pode operar:

- **offline**, com dados locais e sem chamadas externas;
- **com OpenRouter**, usando um modelo configurado por variáveis de ambiente;
- por **HTTP**, via API Express;
- por **MCP stdio**, para integração com clientes compatíveis;
- pela **War Room web**, uma SPA React que conversa com a API HTTP.

## Recursos

- Estratégia **ReAct** com ferramentas operacionais;
- Estratégia **Plan-and-Execute** com plano, execução e replanejamento;
- **Reflexão** opcional para revisar e corrigir uma resposta;
- ferramentas para listar alertas, abrir/resolver incidentes, consultar runbooks e verificar provedores externos;
- histórico de conversas por `conversationId`;
- persistência SQLite para o servidor HTTP;
- store em memória para testes, arena, benchmark e MCP;
- arena e benchmark para comparar estratégias;
- servidor MCP stdio com as operações operacionais principais;
- War Room web (Vite + React) com chat, trace de raciocínio, aprovações e tema claro/escuro, publicada no GitHub Pages.

## Tecnologias

- Node.js 22 LTS
- TypeScript ESM estrito
- LangChain e LangGraph
- OpenRouter via `@langchain/openai`
- Express
- Zod
- SQLite nativo do Node.js
- MCP SDK
- `node:test`
- Vite + React 19 (War Room web)

## Instalação

Requisitos:

- Node.js 22 ou superior;
- npm.

```bash
npm install
npm --prefix web install   # dependências da War Room web
```

Na ausência de uma chave válida do OpenRouter, os modos local e offline continuam disponíveis. Os testes não dependem de rede.

## Configuração

As variáveis podem ser declaradas em um arquivo `.env` local. O arquivo não deve ser versionado.

```env
OPENROUTER_API_KEY=your_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
PORT=3000
OPSPILOT_DB=./data/opspilot.db
OPSPILOT_CORS_ORIGINS=https://scmfaria.github.io
```

Os nomes legados `OPEN_ROUTER_API_KEY`, `OPEN_ROUTER_MODEL` e `OPEN_ROUTER_BASE_URL` também são aceitos.

| Variável | Finalidade | Padrão |
|---|---|---|
| `OPENROUTER_API_KEY` | Chave do OpenRouter | nenhuma |
| `OPENROUTER_MODEL` | Modelo a ser utilizado | `openai/gpt-4o-mini` |
| `OPENROUTER_BASE_URL` | URL da API compatível | `https://openrouter.ai/api/v1` |
| `PORT` | Porta do servidor HTTP | `3000` |
| `OPSPILOT_DB` | Caminho do banco SQLite | `./data/opspilot.db` |
| `OPSPILOT_CORS_ORIGINS` | Origens extras liberadas no CORS, separadas por vírgula | `http://localhost:5173` e `http://127.0.0.1:5173` sempre liberadas |

## Desenvolvimento

Inicie o servidor HTTP:

```bash
npm run dev
```

A API ficará disponível em `http://localhost:3000` por padrão.

### Endpoint `POST /chat`

Exemplo:

```bash
curl -X POST http://localhost:3000/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Liste os alertas disparados e sugira a próxima ação.",
    "strategy": "react",
    "reflect": false
  }'
```

Corpo:

```json
{
  "message": "Liste os alertas disparados e sugira a próxima ação.",
  "strategy": "react",
  "reflect": false,
  "conversationId": "conv-opcional"
}
```

- `message`: mensagem obrigatória;
- `strategy`: `react` ou `plan-and-execute`;
- `reflect`: ativa a reflexão após a execução;
- `conversationId`: opcional; reutiliza o histórico dessa conversa.

Resposta:

```json
{
  "answer": "...",
  "trace": [],
  "metrics": {
    "llmCalls": 1,
    "latencyMs": 142,
    "historyMessages": 0
  },
  "conversationId": "conv-..."
}
```

Códigos principais:

- `200`: execução concluída;
- `400`: payload inválido;
- `422`: estratégia desconhecida;
- `504`: timeout de 180 segundos;
- `400`: também retornado (em JSON) para corpo com JSON malformado;
- `500`: erro interno não tratado.

### CORS

A API responde ao preflight `OPTIONS` com `204` e libera `POST`, `OPTIONS` e os cabeçalhos `Content-Type` e `Authorization` apenas para origens permitidas. As origens de desenvolvimento do Vite (`http://localhost:5173` e `http://127.0.0.1:5173`) são sempre aceitas; outras devem ser declaradas em `OPSPILOT_CORS_ORIGINS` (sem barra final, ex.: `https://scmfaria.github.io`). Requisições de origens não listadas não recebem `Access-Control-Allow-Origin` e são bloqueadas pelo navegador.

## War Room web

SPA em `web/` (Vite + React + TypeScript) para conversar com o OpsPilot, visualizar o trace de raciocínio, acompanhar métricas e decidir aprovações.

Em dois terminais:

```bash
npm run dev          # API em http://localhost:3000
npm run war-room     # SPA em http://localhost:5173/opspilot/
```

A URL da API é configurada na própria interface (ícone de engrenagem) e fica salva no `localStorage` do navegador; o padrão é `http://localhost:3000`.

Build de produção:

```bash
npm run war-room:build            # gera web/dist com base /opspilot/
VITE_BASE=/outro-caminho/ npm --prefix web run build   # base customizada
```

A base pública padrão é `/opspilot/`. A variável `VITE_BASE` permite sobrescrevê-la (usado no deploy do GitHub Pages). O valor é normalizado por `web/base-path.ts`: barras inicial/final são adicionadas e barras repetidas removidas (`ops-pilot-ai-agent` → `/ops-pilot-ai-agent/`). Valores com URL completa (`https://...`), `..` ou espaços fazem o build falhar com uma mensagem citando `VITE_BASE`.

### Deploy no GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica a SPA automaticamente a cada push na `main` que altere `web/**` (ou manualmente via *Run workflow*):

1. `build`: instala dependências com `npm ci` (lockfile obrigatório), roda `npm test` da SPA, gera `web/dist` com `VITE_BASE=/<nome-do-repo>/`, copia `index.html` para `404.html` (fallback de SPA), **verifica o artefato** (o `index.html` precisa referenciar `/<nome-do-repo>/assets/` e o `404.html` precisa existir) e envia o resultado com `actions/upload-pages-artifact@v5`;
2. `deploy`: só roda se o `build` passar; publica o artefato com `actions/deploy-pages@v5` no ambiente `github-pages` e expõe a URL publicada.

Se qualquer passo do `build` falhar, nada é publicado e a versão anterior continua no ar. Execuções concorrentes são enfileiradas (`concurrency: pages`, sem cancelar a publicação em andamento).

Permissões mínimas, declaradas por job (o workflow começa com `permissions: {}`):

```yaml
build:
  permissions:
    contents: read   # checkout do código; o job que executa dependências npm não pode publicar
deploy:
  permissions:
    pages: write     # publicar no GitHub Pages
    id-token: write  # token OIDC exigido por deploy-pages para autenticar na hospedagem
```

O workflow não usa segredos.

Configuração única no repositório (feita por quem administra o repo): **Settings → Pages → Build and deployment → Source: GitHub Actions**. Sem isso, o passo `configure-pages` falha indicando que o Pages não está habilitado.

**Forks**: a base é derivada do nome do repositório (`github.event.repository.name`), então um fork com outro nome publica em `https://<owner>.github.io/<nome-do-fork>/` sem editar o workflow — basta habilitar o Pages como acima.

A SPA ficará em `https://scmfaria.github.io/ops-pilot-ai-agent/`. O Pages hospeda apenas o frontend: a API continua rodando onde você a iniciar. Para usá-la a partir do Pages, inclua `https://scmfaria.github.io` em `OPSPILOT_CORS_ORIGINS` e informe a URL da API na engrenagem (a página é HTTPS, então use uma API HTTPS ou `http://localhost`).

## Servidor MCP

Inicie o servidor em transporte stdio:

```bash
npm run mcp
```

O processo usa o nome MCP `opspilot` e expõe:

- `list_alerts` — lista alertas por `firing`, `resolved` ou `all`;
- `open_incident` — cria um incidente para um serviço;
- `resolve_incident` — resolve um incidente pelo ID.

O canal `stdout` é reservado ao protocolo MCP. Diagnósticos são enviados para `stderr`.

## Estratégias de raciocínio

### `react`

Executa ciclos de raciocínio e ação com acesso às ferramentas operacionais. É adequado para perguntas diretas e intervenções pequenas.

### `plan-and-execute`

Cria um plano, executa as ações necessárias e pode replanejar com base nas observações. É adequado para tarefas com várias etapas.

### Reflexão

Adicione `"reflect": true` ao `/chat` para envolver a estratégia selecionada em um decorator de reflexão. A reflexão pode revisar o trace e produzir até duas correções antes da resposta final.

Na arena, os nomes decorados são:

- `reflect:react`;
- `reflect:plan-and-execute`.

## Ferramentas operacionais

As ferramentas compartilham a mesma fonte de dados usada pelos agentes:

- `list_alerts`;
- `open_incident`;
- `resolve_incident`;
- `list_incidents`;
- `consultar_runbook`;
- `check_provider_status`.

No servidor HTTP, o estado padrão é armazenado em SQLite em `./data/opspilot.db`. Use `OPSPILOT_DB=:memory:` para executar com uma base SQLite isolada em memória.

O MCP usa um store em memória inicializado com os dados de seed. Arena e benchmark também usam o store em memória para manter a execução determinística entre cenários.

## Arena

Compare estratégias no terminal:

```bash
npm run arena -- --strategies react --strategies plan-and-execute
```

Inclua reflexão:

```bash
npm run arena -- --strategies reflect:react --strategies reflect:plan-and-execute
```

Outras opções:

```bash
npm run arena -- --max-iterations 10 --input "Liste todos os alertas críticos"
```

A arena informa o modo (offline/live), resposta, métricas e trace de cada estratégia.

## Benchmark

Execute todos os cenários:

```bash
npm run bench
```

Execute apenas um cenário:

```bash
npm run bench -- --scenario c1
npm run bench -- --scenario c2
npm run bench -- --scenario c3
```

Desative o replanejamento no benchmark:

```bash
npm run bench -- --scenario c2 --no-replanner
```

Os cenários disponíveis são:

- `c1`: contagem e classificação de alertas;
- `c2`: abertura e resolução de múltiplos incidentes;
- `c3`: identificação do alerta ativo mais antigo e abertura de incidente.

A saída consolidada inclui cenário, estratégia, acerto, chamadas ao LLM e latência.

## Testes e validação

Execute os testes:

```bash
npm test
```

Execute a validação de tipos:

```bash
npm run typecheck
```

A suíte cobre estratégias, reflexão, ferramentas, seed, stores SQLite em memória, servidor HTTP (validação, CORS e preflight) e servidor MCP.

Para a War Room web:

```bash
npm --prefix web test     # checagem de tipos da SPA + testes de resolveBasePath
npm run war-room:build    # build de produção
```

## Estrutura do projeto

```text
src/
  agents/
    index.ts              # registro e resolução de estratégias
    models.ts             # configuração do modelo OpenRouter
    plan-and-execute.ts   # estratégia Plan-and-Execute
    react.ts              # estratégia ReAct
    reflection.ts         # decorator de reflexão
    seed.ts               # utilitário de seed
    seed-data.json        # dados iniciais do ambiente em memória
    store.ts              # store em memória
    tools.ts              # ferramentas compartilhadas
    trace.ts              # formatação do trace
    types.ts              # tipos do núcleo de agentes
  http/
    server.ts             # API Express
  mcp/
    server.ts             # servidor MCP stdio
  store/
    ops-store.ts          # contrato único do store
    sqlite-ops-store.ts   # implementação SQLite
  arena.ts                # comparação interativa de estratégias
  bench.ts                # benchmark por cenários
web/
  src/                    # SPA React da War Room
  base-path.ts            # resolveBasePath(): normaliza/valida VITE_BASE
  vite.config.ts          # base pública (/opspilot/ ou VITE_BASE)
.github/workflows/
  deploy-pages.yml        # deploy da SPA no GitHub Pages
```

## Arquitetura

O projeto separa as responsabilidades em camadas:

```text
HTTP / CLI / MCP → service / agents → OpsStore → memória ou SQLite
```

- validações externas usam Zod na borda;
- operações operacionais são centralizadas nas ferramentas;
- agentes não acessam infraestrutura diretamente;
- o `OpsStore` fornece a fonte única de dados para memória e SQLite;
- erros de domínio são traduzidos na borda da aplicação;
- novas funcionalidades devem incluir testes.

## Segurança operacional

- nunca commite segredos ou arquivos `.env`;
- não use uma chave real em testes ou fixtures;
- use `:memory:` ou uma cópia de dados para experimentos locais;
- valide ações destrutivas antes de conectá-las a sistemas reais;
- mantenha dados de produção fora de stores de demonstração.
