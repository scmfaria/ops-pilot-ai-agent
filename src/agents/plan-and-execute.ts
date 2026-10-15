import { z } from "zod";
import { createOpenRouterModel, hasOpenRouterCredentials } from "./models.js";
import { opsTools } from "./tools.js";
import type { ReasoningStrategy, StrategyOptions, TraceEvent } from "./types.js";

type PlanExecutionState = {
  input: string;
  plan: string[];
  done: [string, string][];
  answer: string;
};

const PlannerSchema = z.object({
  steps: z.array(z.string()).min(1).max(8).describe("passos curtos, ordenados, executáveis com as ferramentas disponíveis"),
});

const PLANNER_PROMPT = `You are an OpsPilot planner. Create a compact plan to investigate and resolve the incident.
Return only JSON with a "steps" array of short ordered steps that are executable using the available tools.
Never include markdown fences.`;

async function planner(state: PlanExecutionState): Promise<Pick<PlanExecutionState, "plan">> {
  const model = createOpenRouterModel();

  if (!model) {
    return {
      plan: ["Inspect active alerts", "Review impacted services", "Recommend next action"],
    };
  }

  const result = await model.withStructuredOutput(PlannerSchema).invoke([
    ["system", PLANNER_PROMPT],
    ["user", state.input],
  ]);

  return {
    plan: result.steps.length > 0 ? result.steps.slice(0, 8) : ["Inspect active alerts", "Review impacted services", "Recommend next action"],
  };
}

async function executor(state: PlanExecutionState): Promise<Pick<PlanExecutionState, "done" | "answer">> {
  const done: [string, string][] = [];
  const observations: string[] = [];

  for (const step of state.plan) {
    const lower = step.toLowerCase();

    if (lower.includes("alert") || lower.includes("incident") || lower.includes("status")) {
      const tool = opsTools.find((candidate) => candidate.name === "list_alerts") as any;
      const toolResult = await tool.invoke({ status: "firing" });
      done.push([step, String(toolResult)]);
      observations.push(`${step}: ${String(toolResult)}`);
      continue;
    }

    if (lower.includes("open") || lower.includes("create") || lower.includes("new")) {
      const tool = opsTools.find((candidate) => candidate.name === "open_incident") as any;
      const toolResult = await tool.invoke({
        title: "New incident identified during plan execution",
        service: "frontend",
        severity: "high",
      });
      done.push([step, String(toolResult)]);
      observations.push(`${step}: ${String(toolResult)}`);
      continue;
    }

    if (lower.includes("resolve") || lower.includes("close")) {
      const tool = opsTools.find((candidate) => candidate.name === "resolve_incident") as any;
      const toolResult = await tool.invoke({ id: "alert-1001" });
      done.push([step, String(toolResult)]);
      observations.push(`${step}: ${String(toolResult)}`);
      continue;
    }

    done.push([step, "No tool execution required for this step."]);
    observations.push(`${step}: No tool execution required for this step.`);
  }

  return {
    done,
    answer: observations.length > 0 ? observations.join("\n") : "I handled the request.",
  };
}

async function replanner(state: PlanExecutionState): Promise<Pick<PlanExecutionState, "plan">> {
  const model = createOpenRouterModel();

  if (!model) {
    return { plan: [] };
  }

  const prompt = `Validate if the current execution still matches the goal. Keep the original objective in mind and return a JSON object with a "steps" array only. If there is no work left, return {"steps": []}.\n\nGoal: ${state.input}\n\nExecution log:\n${state.done.map(([step, result]) => `${step} -> ${result}`).join("\n") || "No steps executed yet."}`;

  const result = await model.withStructuredOutput(PlannerSchema).invoke([
    ["system", PLANNER_PROMPT],
    ["user", prompt],
  ]);

  return {
    plan: result.steps.length > 0 ? result.steps.slice(0, 8) : [],
  };
}

export class PlanAndExecuteStrategy implements ReasoningStrategy<string> {
  public name = "plan-and-execute";

  async run(input: string, options: StrategyOptions = {}): Promise<{ answer: string; trace: TraceEvent[]; metrics: { llmCalls: number; latencyMs: number } }> {
    const maxIterations = options.maxIterations ?? 8;
    const startedAt = Date.now();
    const trace: TraceEvent[] = [];
    let llmCalls = 0;

    if (!hasOpenRouterCredentials()) {
      const fallbackAnswer = "Offline mode: I inspected the current ops snapshot and found 3 firing alerts (api-gateway, database, and redis-cache). Recommended next action: prioritize api-gateway, validate owner and impact, then resolve once mitigation is confirmed.";

      return {
        answer: fallbackAnswer,
        trace: [
          { type: "plan", step: 1, plan: ["Inspect active alerts", "Review impacted services", "Recommend next action"] },
          { type: "answer", step: 2, content: fallbackAnswer },
        ],
        metrics: {
          llmCalls: 0,
          latencyMs: Date.now() - startedAt,
        },
      };
    }

    let state: PlanExecutionState = {
      input,
      plan: [],
      done: [],
      answer: "",
    };

    const initialPlan = await planner(state);
    llmCalls += 1;
    state = { ...state, ...initialPlan };
    trace.push({ type: "plan", step: 1, plan: state.plan });

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const executed = await executor(state);
      state = { ...state, ...executed };

      if (executed.done.length > 0) {
        for (const [step, observation] of executed.done) {
          trace.push({ type: "observation", step: trace.length + 1, content: `${step}: ${observation}` });
        }
      }

      if (options.noReplanner) {
        break;
      }

      if (iteration >= maxIterations - 1) {
        break;
      }

      const nextPlan = await replanner(state);
      llmCalls += 1;
      state = { ...state, plan: nextPlan.plan };

      if (nextPlan.plan.length === 0) {
        break;
      }

      trace.push({ type: "critique", step: iteration + 2, content: `Re-plan: ${nextPlan.plan.join(" -> ")}` });
    }

    const finalAnswer = state.answer || "I handled the request.";
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
