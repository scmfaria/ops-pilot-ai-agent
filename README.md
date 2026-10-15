# OpsPilot

OpsPilot é um copiloto de plantão para gerenciar alertas e incidentes de produção. O projeto combina um núcleo de raciocínio em TypeScript com estratégias de agentes (`react`, `plan-and-execute`) e um decorator de reflexão para reavaliar respostas antes de entregar o resultado final.

A aplicação foi pensada para funcionar tanto em modo local/offline quanto com OpenRouter, dependendo das variáveis de ambiente disponíveis.

## Stack

- Node.js 22 LTS
- TypeScript ESM
- LangChain / LangGraph
- OpenRouter (opcional)
- Express
- Zod
- Node Test Runner

## Principais funcionalidades

- Estratégia `react`: agente reativo com uso de ferramentas
- Estratégia `plan-and-execute`: execução por plano + executor + replanejamento
- Decorator `withReflection(...)`: revisa a resposta contra as observações do trace e tenta corrigir quando necessário
- Store em memória com seed em JSON para simular estado operacional real
- HTTP API em `POST /chat`
- Arena de comparação entre estratégias
- Benchmark parametrizado por cenário
- Modo seguro sem chaves: não tenta chamar OpenRouter quando a autenticação não está disponível

## Estrutura do projeto

```text
src/
  agents/
    index.ts
    models.ts
    plan-and-execute.ts
    react.ts
    reflection.ts
    seed.ts
    seed-data.json
    store.ts
    tools.ts
    trace.ts
    types.ts
  http/
    server.ts
    server.test.ts
  arena.ts
  bench.ts
```

## Configuração

Crie um arquivo `.env` com base no exemplo:

```env
OPEN_ROUTER_API_KEY=
OPEN_ROUTER_MODEL=
OPEN_ROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Se a chave não estiver definida, o projeto continua em modo offline/local para testes, arena e benchmark, sem falhar por autenticação ausente.

## Scripts

```bash
npm run dev
npm run arena
npm run bench
npm run seed
npm test
npm run typecheck
```

### Descrição dos scripts

- `npm run dev`: inicia o servidor HTTP em Express
- `npm run arena`: roda comparações entre estratégias no CLI
- `npm run bench`: executa benchmarks por cenário
- `npm run seed`: reconstroi o estado inicial em memória a partir do JSON de seed
- `npm test`: executa os testes automatizados
- `npm run typecheck`: valida o TypeScript sem compilar a saída

## Uso do servidor HTTP

O servidor expõe a rota:

```http
POST /chat
```

Payload esperado:

```json
{
  "message": "Liste os alertas disparados e sugira a próxima ação.",
  "strategy": "react",
  "reflect": false
}
```

Resposta de sucesso:

```json
{
  "answer": "...",
  "trace": [],
  "metrics": {
    "llmCalls": 1,
    "latencyMs": 142
  }
}
```

### Códigos HTTP

- `200`: sucesso
- `400`: body inválido
- `422`: estratégia desconhecida
- `504`: timeout (180s)

## Estratégias disponíveis

### `react`

Estratégia reativa que usa raciocínio passo a passo e ferramentas disponíveis.

### `plan-and-execute`

Estratégia de planejamento, execução e replanejamento diante do estado do sistema.

### `reflect:react` / `reflect:plan-and-execute`

Versões decoradas com reflexão, que avaliam a resposta e tentam melhorar o resultado quando necessário.

## Dados e seed

O store em memória é inicializado a partir de `src/agents/seed-data.json`.

Esse estado inclui serviços e alertas de exemplo, permitindo:

- simular incidentes reais de produção
- testar ações como `openIncident` e `resolveIncident`
- validar decisões do agente sem depender de banco externo

## Benchmark

O benchmark executa cenários de operação para comparar estratégias. Exemplo:

```bash
npm run bench
```

Também é possível especificar cenário e desabilitar o replanejamento:

```bash
node --import tsx src/bench.ts --scenario c1
node --import tsx src/bench.ts --scenario c2 --no-replanner
```

A saída final usa colunas no formato:

```text
cenario | estrategia | acerto | ICalls | latencyMs
```

## Arena

A arena permite comparar estratégias em diferentes prompts e verificar comportamento em modo local/ativo.

```bash
npm run arena -- --strategies react --strategies plan-and-execute
npm run arena -- --strategies reflect:react --strategies reflect:plan-and-execute
```

## Testes

O projeto usa `node:test` com testes automatizados para:

- reflection
- seed/store
- integração da rota `/chat`
- trace determinístico

```bash
npm test
```

## Observações de arquitetura

O código segue a separação por camadas e evita misturar validação com lógica de negócio:

- HTTP/CLI -> serviço -> store
- Zod apenas na borda de entrada/saída
- domínio isolado da infraestrutura
- estratégias e ferramentas são tratadas como módulos independentes

## Segurança

- nunca commitar segredos
- usar `.env` localmente
- o projeto não deve chamar OpenRouter sem chave válida

## Status atual

O projeto está funcional em ambiente local/offline e também preparado para uso com OpenRouter quando as chaves forem configuradas corretamente.
