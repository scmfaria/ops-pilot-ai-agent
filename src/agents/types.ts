export type TraceEventType = "thought" | "action" | "observation" | "plan" | "critique" | "answer";

export type TraceEvent =
  | {
      type: "thought";
      step: number;
      content: string;
    }
  | {
      type: "action";
      step: number;
      tool: string;
      args: Record<string, unknown>;
    }
  | {
      type: "observation";
      step: number;
      content: string;
    }
  | {
      type: "plan";
      step: number;
      plan: string[];
    }
  | {
      type: "critique";
      step: number;
      content: string;
    }
  | {
      type: "answer";
      step: number;
      content: string;
    };

export type ReasoningMetrics = {
  llmCalls: number;
  latencyMs: number;
};

export type StrategyResult = {
  answer: string;
  trace: TraceEvent[];
  metrics: ReasoningMetrics;
};

export type StrategyOptions = {
  maxIterations?: number;
  noReplanner?: boolean;
};

export interface ReasoningStrategy<TInput = unknown> {
  name: string;
  run(input: TInput, options?: StrategyOptions): Promise<StrategyResult>;
}
