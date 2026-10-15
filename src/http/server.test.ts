import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { z } from "zod";
import type { ReasoningStrategy, StrategyResult, StrategyOptions } from "../agents/types.js";

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

test("POST /chat accepts valid request", async () => {
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

    const result = await fakeStrategy.run(body.data.message, { maxIterations: 2 });
    return res.status(200).json({ answer: result.answer, trace: result.trace, metrics: result.metrics });
  });

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  const response = await fetch(`http://127.0.0.1:${port}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "hello" }),
  });

  const payload = (await response.json()) as { answer: string; trace: unknown[]; metrics: { llmCalls: number; latencyMs: number } };
  assert.equal(response.status, 200);
  assert.equal(payload.answer, "fake:hello");

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
