# Spec: MCP Server do OpsPilot

## Contexto
O projeto precisa expor um servidor MCP para permitir que clientes externos executem operações do OpsPilot usando o mesmo store e os mesmos schemas de ferramentas já usados na aplicação. O server deve operar em modo stdio, seguir o protocolo do MCP e expor somente as operações operacionais do domínio, sem duplicar regras de negócio ou criar uma segunda fonte de verdade.

## Requisitos

### 1. Protocolo MCP
O server deve usar `@modelcontextprotocol/sdk` e protocolo de transporte `stdio`.

### 2. Nome e identidade do servidor
- O nome do server deve ser `opspilot`.
- O server deve estar pronto para ser registrado em clientes MCP com esse nome.

### 3. Operações expostas
O server deve expor as ferramentas:
- `list_alerts`
- `open_incident`
- `resolve_incident`

Essas ferramentas devem reutilizar o mesmo `OpsStore` e os mesmos schemas Zod das ferramentas da aplicação.

### 4. Reutilização de fonte única de verdade
As ferramentas do MCP não devem duplicar validações nem reimplementações separadas. Deve haver uma camada única de definição da operação e dos schemas para o store e para o MCP.

### 5. Respeito ao canal de I/O
- `stdout` deve ser utilizado somente pelo protocolo MCP.
- Qualquer diagnóstico, log ou mensagem auxiliar deve sair por `stderr`.
- Nenhum `console.log` pode existir no server MCP.

### 6. Execução local
O server deve ser executado via script npm `mcp`, por exemplo `tsx src/mcp/server.ts`.

### 7. Testes e isolamento
O server deve poder ser validado sem rede e sem depender de qualquer processo externo. O status do protocolo e as ferramentas devem ser testáveis em processo local.

## Requisitos funcionais

- **FR-001**: O server MCP MUST iniciar em modo stdio usando `@modelcontextprotocol/sdk`.
- **FR-002**: O server MUST expor as ferramentas `list_alerts`, `open_incident` e `resolve_incident`.
- **FR-003**: As ferramentas MUST reutilizar os mesmos schemas Zod e o mesmo store usado pela camada de agentes.
- **FR-004**: O server MUST usar `stderr` para diagnósticos e nunca `stdout` para logs ou mensagens de depuração.
- **FR-005**: O server MUST permitir que o mesmo store seja reutilizado em modo teste e em modo produção.
- **FR-006**: O server MUST manter a lógica operacional centralizada e sem duplicação.

## Critérios de aceitação
- O server roda em modo stdio com `@modelcontextprotocol/sdk`.
- A lista de ferramentas expostas corresponde ao domínio operacional do projeto.
- O mesmo OpsStore e os mesmos schemas Zod são reutilizados.
- Os diagnósticos não poluem o canal de protocolo em stdout.
- O ambiente é executável em Node 22 + TypeScript ESM strict.
