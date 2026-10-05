# Spec: Núcleo de raciocínio do OpsPilot

## Contexto
O projeto precisa de um núcleo de raciocínio para interpretar alertas e incidentes de produção, permitindo comparação entre diferentes estratégias de raciocínio (
ReAct e Plan-and-Execute) com um store em memória e uma arena mínima de execução.

## Requisitos

### 1. Contrato de estratégia
Toda estratégia deve implementar a interface comum `ReasoningStrategy` com `name` e `run(input) -> { answer, trace, metrics }`.

### 2. Trace e métricas
- `trace` deve conter eventos tipados: `thought`, `action`, `observation`, `plan`, `critique`, `answer`.
- `action` deve transportar `tool` e `args`.
- `metrics` deve conter `llmCalls` e `latencyMs`.

### 3. Modelo OpenRouter
A fábrica do modelo usa `OPEN_ROUTER_API_KEY`, `OPEN_ROUTER_MODEL`, `OPEN_ROUTER_BASE_URL` e `temperature: 0`.

### 4. Ferramentas operacionais
O projeto deve expor ferramentas mockadas para:
- listagem de alertas por status
- abertura de incidentes
- resolução de incidentes

### 5. Estratégias suportadas
- ReAct usando LangGraph prebuilt
- Plan-and-Execute em grafo com planner, executor e replanner
- limite de iterações configurável

### 6. Arena mínima
A execução deve comparar estratégias sobre o mesmo input com bandeiras de CLI `--strategies` e `--max-iterations`.

### 7. Testes
A lógica do store e a formatação do trace devem ser testados, sem depender de rede.

## Critérios de aceitação
- O store em memória é seedado com 5 serviços e 6 alertas, sendo 3 firing e 3 resolved.
- O trace é determinístico para o mesmo input e cenário.
- As estratégias respeitam limite de iterações e contam chamadas de LLM.
- O ambiente é executável em Node 22 + TypeScript ESM strictly typed.
