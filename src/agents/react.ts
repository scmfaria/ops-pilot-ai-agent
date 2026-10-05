import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createModel } from "./models.js";
import { opsTools } from "./tools.js";
import type { ReasoningStrategy, StrategyOptions, TraceEvent } from "./types.js";

export const reactStrategy: ReasoningStrategy<string> = {
  name: "react",
  async run(input: string, options: StrategyOptions = {}) {
    const startedAt = Date.now();
    const maxIterations = options.maxIterations ?? 12;

    const agent = createReactAgent({
      llm: createModel(),
      tools: opsTools,
      name: "ops-react-agent",
      prompt: "You are an OpsPilot reasoning agent for production incidents. Use tools when needed. Keep answers concise and operational.",
    });

    const result = await agent.invoke(
      {
        messages: [{ role: "user", content: input }],
      },
      { recursionLimit: maxIterations },
    );

    const messages = result.messages ?? [];
    const trace: TraceEvent[] = [];
    let llmCalls = 0;

    for (const message of messages) {
      if (message instanceof HumanMessage) {
        trace.push({ type: "thought", step: trace.length + 1, content: `User: ${String(message.content)}` });
        continue;
      }

      if (message instanceof AIMessage) {
        llmCalls += 1;
        const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content);
        trace.push({ type: "thought", step: trace.length + 1, content: content.slice(0, 500) });
      }

      const toolCalls = (message as { tool_calls?: Array<{ name?: string; args?: Record<string, unknown> }> }).tool_calls || [];
      for (const call of toolCalls) {
        trace.push({
          type: "action",
          step: trace.length + 1,
          tool: call.name ?? "unknown_tool",
          args: call.args ?? {},
        });
      }
    }

    const finalMessage = result.messages?.at(-1);
    const finalAnswer = typeof finalMessage?.content === "string"
      ? finalMessage.content
      : typeof finalMessage?.content === "object"
        ? JSON.stringify(finalMessage.content)
        : "No answer available.";

    trace.push({ type: "answer", step: trace.length + 1, content: finalAnswer });

    return {
      answer: finalAnswer,
      trace,
      metrics: {
        llmCalls,
        latencyMs: Date.now() - startedAt,
      },
    };
  },
};

export class ReActStrategy implements ReasoningStrategy<string> {
  public name = "react";

  async run(input: string, options: StrategyOptions = {}) {
    return reactStrategy.run(input, options);
  }
}
