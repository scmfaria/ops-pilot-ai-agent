import { z } from "zod";
import { createOpenRouterModel, hasOpenRouterCredentials } from "./models.js";
import type { ReasoningStrategy, StrategyOptions, TraceEvent } from "./types.js";

const verdictSchema = z.object({
  approved: z.boolean(),
  feedback: z
    .string()
    .describe("Se aprovado: diga o que está correto e sustentado pelas observações. Se reprovado: descreva exatamente o que precisa ser corrigido."),
});

export type ReflectionOptions<TInput = unknown> = {
  maxReflections?: number;
  modelFactory?: () => any | null;
  systemPrompt?: string;
  buildInput?: (input: TInput, feedback: string) => TInput;
};

function summarizeTraceObservations(trace: TraceEvent[]): string {
  return trace
    .filter((event) => event.type === "observation" || event.type === "action" || event.type === "plan")
    .map((event) => {
      if (event.type === "observation") {
        return `observacao: ${event.content}`;
      }
      if (event.type === "action") {
        return `acao: ${event.tool}(${JSON.stringify(event.args)})`;
      }
      return `plano: ${event.plan.join(" -> ")}`;
    })
    .join("\n");
}

export async function critique<TInput>(
  input: TInput,
  result: { answer: string; trace: TraceEvent[] },
  modelFactory: () => any | null,
  bypassCredentialCheck = false,
) {
  const model = modelFactory();
  if (!model || (!bypassCredentialCheck && !hasOpenRouterCredentials())) {
    return { approved: true, feedback: "Reflection skipped: no valid OpenRouter credentials are configured." };
  }

  const structured = (model as any).withStructuredOutput(verdictSchema);
  return structured.invoke([
    [
      "system",
      "Você deve avaliar a resposta apenas com base nas observações do trace. Se a resposta não estiver suportada por evidência operacional, reprove e descreva exatamente o que corrigir.",
    ],
    [
      "user",
      `Pedido: ${String(input)}\n\nObservações:\n${summarizeTraceObservations(result.trace) || "Nenhuma observação disponível."}\n\nResposta:\n${result.answer}`,
    ],
  ]);
}

export function withReflection<TInput>(strategy: ReasoningStrategy<TInput>, opts: ReflectionOptions<TInput> = {}): ReasoningStrategy<TInput> {
  const maxReflections = opts.maxReflections ?? 2;
  const usesCustomModelFactory = Boolean(opts.modelFactory);
  const modelFactory = opts.modelFactory ?? (() => createOpenRouterModel());

  return {
    name: `reflect:${strategy.name}`,
    async run(input: TInput, options: StrategyOptions = {}) {
      const startedAt = Date.now();
      let currentInput = input;
      let currentResult = await strategy.run(currentInput, options);
      let llmCalls = currentResult.metrics.llmCalls;
      let trace = [...currentResult.trace];
      let reflectionCount = 0;

      while (reflectionCount <= maxReflections) {
        const review = await critique(currentInput, currentResult, modelFactory, usesCustomModelFactory);
        llmCalls += 1;

        if (!review || !review.approved) {
          const feedback = review?.feedback || "Use as observações do trace para fundamentar a resposta.";
          reflectionCount += 1;
          trace.push({
            type: "critique",
            step: trace.length + 1,
            content: `Reflection rejected: ${feedback}`,
          });

          if (reflectionCount > maxReflections) {
            break;
          }

          const reinput = opts.buildInput
            ? opts.buildInput(currentInput, feedback)
            : (`${String(currentInput)}\n\nReflection feedback: ${feedback}\nRevise a resposta usando apenas as observações do trace e o contexto operacional.` as TInput);

          const nextResult = await strategy.run(reinput, options);
          llmCalls += nextResult.metrics.llmCalls;
          currentInput = reinput;
          currentResult = nextResult;
          trace = [...trace, ...nextResult.trace];
          continue;
        }

        trace.push({
          type: "critique",
          step: trace.length + 1,
          content: review.feedback || "Answer approved by reflection.",
        });

        return {
          answer: currentResult.answer,
          trace,
          metrics: {
            llmCalls,
            latencyMs: Date.now() - startedAt,
          },
        };
      }

      return {
        answer: currentResult.answer,
        trace,
        metrics: {
          llmCalls,
          latencyMs: Date.now() - startedAt,
        },
      };
    },
  };
}
