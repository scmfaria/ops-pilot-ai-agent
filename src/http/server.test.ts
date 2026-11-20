import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { z } from "zod";
import type { ReasoningStrategy, StrategyResult, StrategyOptions } from "../agents/types.js";
import { createApp, parseAllowedOrigins } from "./server.js";

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
  await withApp(buildApp(), async (baseUrl) => {
    const firstResponse = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });

    const firstPayload = await firstResponse.json() as { conversationId: string; metrics: { historyMessages: number } };
    assert.equal(firstResponse.status, 200);
    assert.ok(firstPayload.conversationId.startsWith("conv-"));
    assert.equal(firstPayload.metrics.historyMessages, 0);

    const secondResponse = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "follow up", conversationId: firstPayload.conversationId }),
    });

    const secondPayload = await secondResponse.json() as { conversationId: string; metrics: { historyMessages: number } };
    assert.equal(secondResponse.status, 200);
    assert.equal(secondPayload.conversationId, firstPayload.conversationId);
    // first exchange stored user + assistant messages
    assert.equal(secondPayload.metrics.historyMessages, 2);
  });
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

async function withApp<T>(app: ReturnType<typeof createApp>, run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const buildApp = (corsOrigins?: string[]) =>
  createApp({ store: createMemoryStore() as never, resolveStrategy: () => fakeStrategy, corsOrigins });

test("POST /chat via createApp returns 400 for empty message", async () => {
  await withApp(buildApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    const payload = await response.json() as { error: string; issues: Array<{ path: string[] }> };
    assert.equal(response.status, 400);
    assert.equal(payload.error, "invalid_body");
    assert.deepEqual(payload.issues[0]?.path, ["message"]);
  });
});

test("POST /chat via createApp returns 400 for wrong field types", async () => {
  await withApp(buildApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi", reflect: "yes", conversationId: "" }),
    });
    const payload = await response.json() as { error: string; issues: Array<{ path: string[] }> };
    assert.equal(response.status, 400);
    assert.equal(payload.error, "invalid_body");
    const paths = payload.issues.map((issue) => issue.path.join("."));
    assert.ok(paths.includes("reflect"));
    assert.ok(paths.includes("conversationId"));
  });
});

test("POST /chat returns JSON 400 for malformed JSON", async () => {
  await withApp(buildApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const payload = await response.json() as { error: string };
    assert.equal(response.status, 400);
    assert.equal(payload.error, "invalid_body");
  });
});

test("POST /chat returns 422 for unknown strategy", async () => {
  const app = createApp({
    store: createMemoryStore() as never,
    resolveStrategy: (name) => {
      throw new Error(`Unknown strategy: ${name}`);
    },
  });
  await withApp(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi", strategy: "nope" }),
    });
    const payload = await response.json() as { error: string };
    assert.equal(response.status, 422);
    assert.equal(payload.error, "unknown_strategy");
  });
});

test("parseAllowedOrigins includes local dev origins and env origins", () => {
  const origins = parseAllowedOrigins(" https://ops.example.com/ , ,http://localhost:5173");
  assert.ok(origins.includes("http://localhost:5173"));
  assert.ok(origins.includes("http://127.0.0.1:5173"));
  assert.ok(origins.includes("https://ops.example.com"));
  assert.equal(origins.filter((origin) => origin === "http://localhost:5173").length, 1);
  assert.deepEqual(parseAllowedOrigins(undefined), ["http://localhost:5173", "http://127.0.0.1:5173"]);
});

test("OPTIONS /chat preflight from allowed origin returns CORS headers", async () => {
  await withApp(buildApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.match(response.headers.get("access-control-allow-methods") ?? "", /POST/);
    assert.match(response.headers.get("access-control-allow-methods") ?? "", /OPTIONS/);
    assert.match(response.headers.get("access-control-allow-headers") ?? "", /Content-Type/);
    assert.match(response.headers.get("access-control-allow-headers") ?? "", /Authorization/);
    assert.match(response.headers.get("vary") ?? "", /Origin/);
  });
});

test("OPTIONS /chat preflight from disallowed origin omits CORS headers", async () => {
  await withApp(buildApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example.com", "Access-Control-Request-Method": "POST" },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    assert.equal(response.headers.get("access-control-allow-methods"), null);
  });
});

test("POST /chat from configured origin echoes Access-Control-Allow-Origin", async () => {
  await withApp(buildApp(parseAllowedOrigins("https://ops.example.com")), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", Origin: "https://ops.example.com" },
      body: JSON.stringify({ message: "hello" }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://ops.example.com");
  });
});
