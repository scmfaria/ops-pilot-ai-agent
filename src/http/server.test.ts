import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { z } from "zod";
import type { ReasoningStrategy, StrategyResult, StrategyOptions } from "../agents/types.js";
import { createApp } from "./server.js";

const fakeStrategy: ReasoningStrategy<string> = {
  name: "fake",
  async run(input: string, _options: StrategyOptions = {}): Promise<StrategyResult> {
    return {
      answer: `fake:${input}`,
      trace: [
        { type: "thought", step: 1, content: "fake reasoning step" },
        { type: "observation", step: 2, content: "evidence: ok" },
      ],
      metrics: { llmCalls: 0, latencyMs: 7 },
    };
  },
};

const createMemoryStore = () => {
  const memory = new Map<string, Array<{ role: "user" | "assistant"; content: string }>>();
  return {
    createConversation: () => {
      const id = `conv-${Math.random().toString(16).slice(2, 9)}`;
      memory.set(id, []);
      return { id, createdAt: new Date().toISOString() };
    },
    appendMessage: (conversationId: string, role: "user" | "assistant", content: string) => {
      const messages = memory.get(conversationId) ?? [];
      messages.push({ role, content });
      memory.set(conversationId, messages);
      return { id: `msg-${Math.random().toString(16).slice(2, 9)}`, conversationId, role, content, createdAt: new Date().toISOString() };
    },
    lastMessages: (conversationId: string, limit = 12) => {
      const messages = memory.get(conversationId) ?? [];
      return messages.slice(-limit).map((message, index) => ({
        id: `msg-${conversationId}-${index}`,
        conversationId,
        role: message.role,
        content: message.content,
        createdAt: new Date().toISOString(),
      }));
    },
  };
};

test("POST /chat accepts valid request", async () => {
  const app = express();
  app.use(express.json());

  app.post("/chat", async (req, res) => {
    const body = z.object({
      message: z.string().min(1),
      strategy: z.string().default("react"),
      reflect: z.boolean().default(false),
      conversationId: z.string().min(1).optional(),
    }).safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({ error: "invalid_body", issues: body.error.issues });
    }

    const result = await fakeStrategy.run(body.data.message, { maxIterations: 2 });
    return res.status(200).json({ answer: result.answer, trace: result.trace, metrics: result.metrics, conversationId: body.data.conversationId ?? "conv-test" });
  });

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  const response = await fetch(`http://127.0.0.1:${port}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "hello" }),
  });

  const payload = (await response.json()) as { answer: string; trace: unknown[]; metrics: { llmCalls: number; latencyMs: number }; conversationId: string };
  assert.equal(response.status, 200);
  assert.equal(payload.answer, "fake:hello");
  assert.equal(payload.conversationId, "conv-test");

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("POST /chat persists conversationId and historyMessages via app store", async () => {
  const store = createMemoryStore();
  const app = createApp({
    store: store as never,
    resolveStrategy: () => fakeStrategy,
  });

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  const firstResponse = await fetch(`http://127.0.0.1:${port}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "hello" }),
  });

  const firstPayload = await firstResponse.json() as { conversationId: string; metrics: { historyMessages: number } };
  assert.equal(firstResponse.status, 200);
  assert.ok(firstPayload.conversationId.startsWith("conv-"));
  assert.equal(firstPayload.metrics.historyMessages, 0);

  const secondResponse = await fetch(`http://127.0.0.1:${port}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "follow up", conversationId: firstPayload.conversationId }),
  });

  const secondPayload = await secondResponse.json() as { conversationId: string; metrics: { historyMessages: number } };
  assert.equal(secondResponse.status, 200);
  assert.equal(secondPayload.conversationId, firstPayload.conversationId);
  assert.equal(secondPayload.metrics.historyMessages, 1);

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("POST /chat rejects invalid body", async () => {
  const app = express();
  app.use(express.json());

  app.post("/chat", async (req, res) => {
    const body = z.object({
      message: z.string().min(1),
      strategy: z.string().default("react"),
      reflect: z.boolean().default(false),
    }).safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({ error: "invalid_body", issues: body.error.issues });
    }

    return res.status(200).json({ ok: true });
  });

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  const response = await fetch(`http://127.0.0.1:${port}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "" }),
  });

  const payload = (await response.json()) as { error: string; issues?: Array<{ path: string[] }> };
  assert.equal(response.status, 400);
  assert.equal(payload.error, "invalid_body");

  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
