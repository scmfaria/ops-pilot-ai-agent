import type { TraceEvent } from "./types.js";

export function formatTrace(trace: TraceEvent[]): string {
  return trace
    .map((event) => {
      switch (event.type) {
        case "thought":
          return `[thought:${event.step}] ${event.content}`;
        case "action":
          return `[action:${event.step}] ${event.tool}(${JSON.stringify(event.args)})`;
        case "observation":
          return `[observation:${event.step}] ${event.content}`;
        case "plan":
          return `[plan:${event.step}] ${event.plan.join(" -> ")}`;
        case "critique":
          return `[critique:${event.step}] ${event.content}`;
        case "answer":
          return `[answer:${event.step}] ${event.content}`;
        default:
          return "";
      }
    })
    .join("\n");
}

export function summarizeTrace(trace: TraceEvent[]): string {
  return trace
    .filter((event) => event.type === "action" || event.type === "observation" || event.type === "answer")
    .map((event) => {
      if (event.type === "action") {
        return `${event.tool}(${JSON.stringify(event.args)})`;
      }
      return event.type === "answer" ? event.content : event.content;
    })
    .join(" | ");
}
