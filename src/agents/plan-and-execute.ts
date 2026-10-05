import { z } from "zod";
import { createOpenRouterModel } from "./models.js";
import { opsTools } from "./tools.js";
import type { ReasoningStrategy, StrategyOptions, TraceEvent } from "./types.js";

const PlannerSchema = z.object({
  steps: z.array(z.string()).max(8),
});

export class PlanAndExecuteStrategy implements ReasoningStrategy<string> {
  public name = "plan-and-execute";

  async run(input: string, options: StrategyOptions = {}): Promise<{ answer: string; trace: TraceEvent[]; metrics: { llmCalls: number; latencyMs: number } }> {
    const maxIterations = options.maxIterations ?? 8;
    const startedAt = Date.now();
    const trace: TraceEvent[] = [];
    let llmCalls = 0;

    const model = createOpenRouterModel();

    const planText = await model.invoke(`Create a concise execution plan with at most ${maxIterations} steps to address this OpsPilot request:\n\n${input}`);
    llmCalls += 1;

    const planContent =
      typeof planText.content === "string"
        ? planText.content
        : JSON.stringify(planText.content);

    const parsedPlan = (() => {
      try {
        const json = JSON.parse(planContent);
        const safe = PlannerSchema.safeParse(json);
        return safe.success ? safe.data.steps : ["Inspect alerts", "Recommend action", "Answer user"];
      } catch {
        return ["Inspect alerts", "Recommend action", "Answer user"];
      }
    })();

    trace.push({ type: "plan", step: 1, plan: parsedPlan });

    let remaining = [...parsedPlan];
    let finalAnswer = "I handled the request.";

    for (let index = 0; index < remaining.length; index += 1) {
      const step = remaining[index];
      trace.push({ type: "thought", step: index + 1, content: `Executing step: ${step}` });

      const listAlertsTool = opsTools.find((tool) => tool.name === "list_alerts");
      if (listAlertsTool && (step.toLowerCase().includes("alert") || step.toLowerCase().includes("incident"))) {
        trace.push({
          type: "action",
          step: index + 1,
          tool: listAlertsTool.name,
          args: { status: "firing" },
        });
        const toolResult = await (listAlertsTool as any).invoke({ status: "firing" });
        trace.push({ type: "observation", step: index + 1, content: String(toolResult) });
        finalAnswer = `I reviewed the active alerts: ${String(toolResult)}`;
      }

      const review = await model.invoke(`Re-evaluate whether the remaining plan is still valid. Current step: ${step}. Remaining: ${remaining.slice(index + 1).join(", ") || "none"}`);
      llmCalls += 1;
      trace.push({ type: "critique", step: index + 1, content: String(review.content) });
    }

    trace.push({ type: "answer", step: trace.length + 1, content: finalAnswer });

    return {
      answer: finalAnswer,
      trace,
      metrics: {
        llmCalls,
        latencyMs: Date.now() - startedAt,
      },
    };
  }
}

export const planAndExecuteStrategy = new PlanAndExecuteStrategy();
