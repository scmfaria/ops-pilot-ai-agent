import { z } from "zod";

export const traceEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("thought"), step: z.number(), content: z.string() }),
  z.object({ type: z.literal("action"), step: z.number(), tool: z.string(), args: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal("observation"), step: z.number(), content: z.string() }),
  z.object({ type: z.literal("plan"), step: z.number(), plan: z.array(z.string()) }),
  z.object({ type: z.literal("critique"), step: z.number(), content: z.string() }),
  z.object({ type: z.literal("answer"), step: z.number(), content: z.string() }),
]);

export const chatResponseSchema = z.object({
  answer: z.string(),
  trace: z.array(traceEventSchema).default([]),
  metrics: z.object({
    llmCalls: z.number(),
    latencyMs: z.number(),
    historyMessages: z.number().optional(),
  }),
  conversationId: z.string(),
  pendingApproval: z.boolean().optional(),
  proposal: z.object({ title: z.string(), description: z.string() }).optional(),
});

export type TraceEvent = z.infer<typeof traceEventSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
