# Contract: ReasoningStrategy

## Interface
```ts
interface ReasoningStrategy<TInput = unknown> {
  name: string;
  run(input: TInput, options?: { maxIterations?: number }): Promise<{
    answer: string;
    trace: TraceEvent[];
    metrics: {
      llmCalls: number;
      latencyMs: number;
    };
  }>;
}
```

## Event contract
```ts
type TraceEvent =
  | { type: "thought"; step: number; content: string }
  | { type: "action"; step: number; tool: string; args: Record<string, unknown> }
  | { type: "observation"; step: number; content: string }
  | { type: "plan"; step: number; plan: string[] }
  | { type: "critique"; step: number; content: string }
  | { type: "answer"; step: number; content: string };
```

## Tool contract
- `list_alerts(status?: "all" | "firing" | "resolved")`
- `open_incident(title: string, service: string, severity: "critical" | "high" | "medium" | "low")`
- `resolve_incident(id: string)`

## Constraints
- `llmCalls` must be incremented only on actual model calls.
- `latencyMs` must be measured from start to finish of `run()`.
- `action` events must include both `tool` and `args`.
