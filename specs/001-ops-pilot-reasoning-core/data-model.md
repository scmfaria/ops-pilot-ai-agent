# Data Model: Núcleo de raciocínio do OpsPilot

## Entidades

### ServiceRecord
- `id: string`
- `name: string`
- `owner: string`
- `status: "healthy" | "degraded" | "warning"`

### AlertRecord
- `id: string`
- `title: string`
- `service: string`
- `severity: "critical" | "high" | "medium" | "low"`
- `status: "firing" | "resolved"`
- `createdAt: string`
- `updatedAt: string`

### TraceEvent
- `type: "thought" | "action" | "observation" | "plan" | "critique" | "answer"`
- `step: number`
- `content?: string`
- `tool?: string`
- `args?: Record<string, unknown>`
- `plan?: string[]`

### ReasoningMetrics
- `llmCalls: number`
- `latencyMs: number`

### StrategyResult
- `answer: string`
- `trace: TraceEvent[]`
- `metrics: ReasoningMetrics`

## Relações
- Um `MemoryOpsStore` possui vários `ServiceRecord` e `AlertRecord`.
- As ferramentas operam sobre o mesmo store compartilhado pela arena.
- Cada estratégia produz um `StrategyResult` independente, permitindo comparação em execução.

## Regras
- `list_alerts` filtra por status.
- `open_incident` cria um alert novo em estado `firing`.
- `resolve_incident` marca um incidente como `resolved`.
- O trace é append-only por execução e deve ser serializável para log.
