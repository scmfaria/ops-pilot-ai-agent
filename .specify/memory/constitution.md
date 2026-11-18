<!--
Sync Impact Report
- Version change: 1.0.0 -> 2.0.0
- Modified principles: Arquitetura, Stack Obrigatória, Convenções de Código, Regras de persistência local
- Added sections: SQLite-first persistence guidance, local file database governance, required DDL/idempotent seed constraints
- Removed sections: MySQL-specific storage requirements and Sequelize-only assumptions
- Follow-up TODOs: none
-->

# Constitution - OpsPilot

Diretrizes arquiteturais e princípios não negociáveis que toda spec, plano, tarefa e código devem seguir.

---

## 🏗️ Arquitetura

**Padrão MVC** com separação clara de responsabilidades:

- **Model (Domínio)** - Lógica de negócio pura, sem I/O
- **View/HTTP (Fronteira)** - Controllers Express, validação com Zod, tradução de erros
- **Control/Service (Orquestração)** - Coordenação entre domínio e persistência
- **Store (Infraestrutura)** - SQLite via `node:sqlite` (`DatabaseSync`), operações de dados

**Fluxo de dependências**: `HTTP/CLI → Service → Store` (unidirecional)

**Persistência obrigatória**: o projeto usa SQLite como banco de dados primário. O caminho padrão é `./data/opspilot.db` via variável de ambiente `OPSPILOT_DB`. Em testes, o store deve usar `:memory:` para isolamento determinístico.

---

## 📋 Sete Princípios Inegociáveis

### I. Camadas Explícitas
Dependências fluem em uma única direção: `http/cli -> service -> store`.
- Domínio não faz I/O (sem requisições HTTP, banco, I/O de arquivo)
- Cada camada conhece apenas quem está abaixo
- Testes de domínio não precisam de mocks de infra
- Persistência é sempre encapsulada em um store específico

### II. Validações na Fronteira
Toda entrada externa é validada com **Zod** antes de entrar no domínio.
- Request HTTP → validado com schema Zod
- CLI args → validado antes de processar
- Dados do banco → validados ao retornar para camadas altas
- Erro de validação = responsabilidade da borda, nunca do domínio
- Domínio e store devem operar com tipos fechados e valores consistentes

### III. Erros são de Domínio
Falhas previsíveis tornam-se **classes de erro** no domínio.
- Erros de domínio são traduzidos em status HTTP/códigos de saída na borda
- Não lance strings de erro ou objetos genéricos
- Cada erro tem mensagem clara e código único
- Exemplo: `InvalidAlertError`, `UnauthorizedIncidentUpdateError`

### IV. Teste é Parte da Tarefa
Nenhuma lógica nova entra sem teste.
- `npm run test` sempre verde
- `npm run typecheck` sempre verde
- Testes devem ser simples e diretos
- Prefira testes de unidade para lógica, testes de integração para fluxos
- Regras de persistência em SQLite devem ser validadas com testes determinísticos em `:memory:`

### V. Segurança por Padrão
Sem segredos no repositório, ações destrutivas têm guardrails.
- Use `process.env` via `.env` (nunca comitar segredos)
- Pre-commit hooks devem bloquear segredos
- Operações críticas (delete, update em produção) passam por deny lists, não confiança
- Validação rigorosa de permissões/autorização
- Dados locais do projeto devem ficar em `data/`, e esse diretório deve ser ignorado por padrão no git

### VI. Spec Antes de Código
Mudanças relevantes seguem: **spec → plan → task → implement**
- Spec define o que será feito e por quê
- Plan quebra em tarefas técnicas
- Cada task é um PR/commit
- Revisão humana entre fases (humano aprova spec antes de implementar)
- Alterações de persistência, schema e banco devem ter specs explícitas e testes de migração/seed

### VII. Pequeno, Um Commit
Cada tarefa cabe em um commit.
- PR deve ser entendível em 5 minutos
- Refatoração separada de feature
- Se foi grande, dividir em tarefas menores

---

## 🛠️ Stack Obrigatória

| Tecnologia | Versão/Motivo |
|---|---|
| **Runtime** | Node.js 22 LTS |
| **Linguagem** | TypeScript ESM, `strict: true` |
| **Validação** | Zod (entrada/saída) |
| **Web Framework** | Express |
| **Banco de Dados** | SQLite via `node:sqlite` (`DatabaseSync`) |
| **Persistência local** | diretório `data/`, default `./data/opspilot.db`, `:memory:` em testes |
| **Agentes/IA** | LangChain/LangGraph sobre OpenRouter |
| **Testing** | Node.js built-in `node:test` via tsx |
| **HTTP** | Express + JSON API |
| **Build/Transpile** | tsx |

**Regra de armazenamento**:
- SQLite é o banco oficial do projeto;
- não usar MySQL/Sequelize como padrão para este repositório;
- a camada de persistência deve ser implementada com `node:sqlite` e `DatabaseSync`;
- scripts e tests devem trabalhar com `:memory:` para isolamento e rapidez;
- a configuração do path deve sair do `OPSPILOT_DB` e nunca de hardcoded em código.

---

## 🧱 Regras de Persistência

### SQLite First
- O store de produção deve persistir em SQLite local
- DDL deve ser idempotente e executado no construtor do store
- Queries devem usar `prepare()` / prepared statements, sem interpolação de SQL
- O schema deve refletir os tipos do domínio com tabelas explícitas: `services`, `alerts`, `incidents`, `runbooks`

### Schema e Domínio
- `alerts` e `incidents` devem respeitar domínios fechados e enums
- `tier`, `severity`, `status` e campos equivalentes devem ser validados por `CHECK` no banco
- `incidents` deve registrar `summary` e `resolved_at`, com `NULL` permitido antes de resolução
- O seed deve ser idempotente e determinístico para reproduzir cenários de produção e testes

### Estado local e testes
- `:memory:` é obrigatório para testes unitários e de integração de store
- `./data/opspilot.db` deve ser usado apenas para ambiente local/development
- Arquivos de dados locais devem ser versionados como não rastreados pelo git

---

## 📝 Convenções de Código

### Estrutura de Projeto
```
src/
├── http/           # Controllers, validação com Zod
├── service/        # Orquestração entre domínio e store
├── store/          # SQLite, queries, persistência
├── domain/         # Lógica de negócio pura
├── agents/         # LangChain/LangGraph workflows
└── [feature].test.ts  # Testes colocalizados
```

### Regras
- ✅ Código simples e explícito (sem abstrações desnecessárias)
- ✅ **Funções puras** (mesmo input = mesmo output, sem side effects)
- ❌ Não misture validação com lógica de negócio
- ❌ Não misture I/O com lógica
- ✅ Separe concerns: HTTP, domínio, infraestrutura, agentes
- ✅ Use `process.env` via `.env` (arquivo local, não versionado)
- ✅ Rejeite dependências extras sem necessidade
- ✅ Imports absolutos para domínio (`import { Alert } from '@/domain/alert'`)
- ✅ Store SQLite deve expor uma API estável e consistente para `list`, `open`, `resolve`, `seed`, etc.

### Exemplo de Separação
```typescript
// ❌ ERRADO
export function createAlert(data: unknown) {
  const alert = { ...data }; // sem validação
  return db.insert(alert);   // mistura lógica com I/O
}

// ✅ CORRETO
// http/controller.ts
export async function createAlertHandler(req, res) {
  const input = alertSchema.parse(req.body); // validação na borda
  const alert = await service.createAlert(input);
  res.json(alert);
}

// service/alert.ts
export async function createAlert(input: CreateAlertInput): Promise<Alert> {
  const alert = domain.buildAlert(input); // lógica pura no domínio
  return store.saveAlert(alert);          // persist
}

// domain/alert.ts
export function buildAlert(input: CreateAlertInput): Alert {
  // Lógica pura, sem I/O, sem side effects
  return { id: crypto.randomUUID(), ...input, createdAt: new Date() };
}
```

---

## 🚀 Comandos Principais

```bash
# Desenvolvimento
npm run dev        # Executa a aplicação (tsx src/http/server.ts)

# Arena (sandbox/playground)
npm run arena      # Executa arena (tsx src/arena.ts)

# Benchmark
npm run bench      # Executa performance tests (node --import tsx src/bench.ts)

# Seed/local persistence
npm run seed       # Reconstroi seed do banco SQLite local

# Validação
npm run test       # Roda testes (node --import tsx --test src/**/*.test.ts)
npm run typecheck  # Verifica tipos TypeScript (tsc --noEmit)
```

---

## 📚 Fluxo de Desenvolvimento

### Para Feature Nova
1. **Specify** → Criar spec em `.specify/` descrevendo o que/por quê
2. **Plan** → Quebrar em tarefas técnicas
3. **Task** → Cada tarefa é um PR com:
   - Testes passando
   - TypeCheck passando
   - Commit atômico
   - Descrição clara
4. **Implement** → Seguir convenções de código

### Para Bug Fix
1. Escrever teste que reproduz o bug
2. Fazer fix mínimo
3. Teste fica verde
4. 1 commit

---

## ✅ Checklist pré-commit

- [ ] `npm run typecheck` passa
- [ ] `npm run test` passa (cobertura > 80% para código novo)
- [ ] Sem segredos/credenciais no código
- [ ] Sem console.log em produção
- [ ] Validação Zod na borda (HTTP/CLI)
- [ ] Erros como classes de domínio
- [ ] Funções puras no domínio
- [ ] Store SQLite usa prepared statements e DDL idempotente
- [ ] `data/` ignorado e fora do versionamento
- [ ] Commit atômico, descrição clara

---

## 🔒 Segurança

- **Secrets**: `process.env` + `.env.local` (não versionado)
- **Pre-commit**: Bloquear patterns como `OPENAI_API_KEY=`, `password:`, etc.
- **Ações destrutivas**: Requerem confirmação/deny-list (não confiança em modelo)
- **Validação**: Sempre validar entrada de usuário com Zod
- **Permissões**: Verificar autorização antes de qualquer operação
- **Persistência local**: manter apenas arquivos de banco em `data/` e nunca em paste de código-fonte

---

## 📌 Resumo Executivo

OpsPilot é um **copiloto de plantão** para gerenciar alertas e incidentes em produção, usando **agentes LangChain/LangGraph** sobre OpenRouter.

- **Arquitetura**: MVC com domínio puro
- **Stack**: Node 22, TypeScript strict, Express, SQLite, Zod, LangGraph
- **Qualidade**: Spec → Plan → Task → Implement, testes obrigatórios
- **Código**: Simples, explícito, funcional, testado
- **Persistência**: SQLite local com `DatabaseSync`, `:memory:` por testes, `data/opspilot.db` por ambiente local

---

## 🏛️ Governança

Esta constituição é inegociável e supersede todas as outras práticas.

**Version**: 2.0.0 | **Ratified**: 2026-10-16 | **Last Amended**: 2026-10-16

Mudanças de governança, arquitetura ou tecnologia devem ser aprovadas por atualização explícita desta constituição e por validação com testes, docs e plano de migração quando aplicável.
