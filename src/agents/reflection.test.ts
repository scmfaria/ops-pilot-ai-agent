import test from "node:test";
import assert from "node:assert/strict";
import { withReflection } from "./reflection.js";
import type { ReasoningStrategy, StrategyOptions } from "./types.js";

const baseStrategy: ReasoningStrategy<string> = {
  name: "stub",
  async run(input: string, _options: StrategyOptions = {}) {
    return {
      answer: `Answer for: ${input}`,
      trace: [
        { type: "thought", step: 1, content: "Thinking" },
        { type: "observation", step: 2, content: "Observed evidence: payments are healthy" },
      ],
      metrics: { llmCalls: 1, latencyMs: 5 },
    };
  },
};

test("withReflection approves when the answer is grounded and preserves metrics", async () => {
  const reflected = withReflection(baseStrategy, {
    modelFactory: () => ({
      withStructuredOutput: () => ({
        invoke: async () => ({ approved: true, feedback: "Looks good." }),
      }),
    }),
    maxReflections: 2,
  });

  const result = await reflected.run("List active alerts", { maxIterations: 3 });

  assert.equal(result.answer, "Answer for: List active alerts");
  assert.equal(result.metrics.llmCalls, 2);
  assert.ok(result.trace.some((event) => event.type === "critique"));
});

test("withReflection retries while the answer is not approved and stops after maxReflections", async () => {
  let calls = 0;

  const reflected = withReflection(baseStrategy, {
    maxReflections: 1,
    modelFactory: () => ({
      withStructuredOutput: () => ({
        invoke: async () => {
          calls += 1;
          return calls === 1 ? { approved: false, feedback: "Evidence missing." } : { approved: true, feedback: "Approved after retry." };
        },
      }),
    }),
  });

  const result = await reflected.run("List active alerts");

  assert.equal(result.metrics.llmCalls, 4);
  assert.ok(result.trace.some((event) => event.type === "critique"));
  assert.equal(calls, 2);
});
