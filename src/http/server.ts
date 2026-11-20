import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { resolveStrategy } from "../agents/index.js";
import type { ReasoningStrategy } from "../agents/types.js";
import { createSqliteOpsStore } from "../store/sqlite-ops-store.js";
import type { OpsStore } from "../store/ops-store.js";

const chatBodySchema = z.object({
  message: z.string().min(1, "message is required"),
  strategy: z.string().default("react"),
  reflect: z.boolean().default(false),
  conversationId: z.string().min(1).optional(),
});

const DEFAULT_HISTORY_LIMIT = 12;

function composeConversationPrompt(message: string, history: Array<{ role: "user" | "assistant"; content: string }>) {
  if (history.length === 0) {
    return { prompt: message, historyMessages: 0 };
  }

  const formattedHistory = history
    .map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`)
    .join("\n");

  return {
    prompt: `Conversation history:\n${formattedHistory}\n\nUser: ${message}`,
    historyMessages: history.length,
  };
}

export const DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"] as const;
const CORS_ALLOWED_METHODS = "POST, OPTIONS";
const CORS_ALLOWED_HEADERS = "Content-Type, Authorization";

export function parseAllowedOrigins(raw: string | undefined): string[] {
  const configured = (raw ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return [...new Set([...DEFAULT_CORS_ORIGINS, ...configured])];
}

export function createApp(
  deps: {
    store?: OpsStore;
    resolveStrategy?: (name: string, reflect?: boolean) => ReasoningStrategy<string>;
    corsOrigins?: string[];
  } = {},
) {
  const app = express();
  const store = deps.store ?? createSqliteOpsStore();
  const resolveStrategyFn = deps.resolveStrategy ?? resolveStrategy;

  const allowedOrigins = new Set(deps.corsOrigins ?? parseAllowedOrigins(process.env.OPSPILOT_CORS_ORIGINS));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    res.setHeader("Vary", "Origin");
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", CORS_ALLOWED_METHODS);
      res.setHeader("Access-Control-Allow-Headers", CORS_ALLOWED_HEADERS);
      res.setHeader("Access-Control-Max-Age", "600");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json());

  app.post("/chat", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = chatBodySchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "invalid_body",
          issues: parsed.error.issues,
        });
      }

      const { message, strategy, reflect, conversationId: existingConversationId } = parsed.data;
      const conversationId = existingConversationId ?? store.createConversation().id;
      const previousMessages = existingConversationId ? store.lastMessages(conversationId, DEFAULT_HISTORY_LIMIT) : [];
      const { prompt, historyMessages } = composeConversationPrompt(message, previousMessages);

      let strategyInstance;
      try {
        strategyInstance = resolveStrategyFn(strategy, reflect);
      } catch (error) {
        return res.status(422).json({
          error: "unknown_strategy",
          message: error instanceof Error ? error.message : "Unknown strategy",
        });
      }

      store.appendMessage(conversationId, "user", message);

      const timeoutMs = 180_000;
      const resultPromise = strategyInstance.run(prompt, { maxIterations: 6 });
      let timeoutHandle: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      });

      const result = await Promise.race([resultPromise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
      store.appendMessage(conversationId, "assistant", result.answer);

      return res.status(200).json({
        answer: result.answer,
        trace: result.trace,
        metrics: { ...result.metrics, historyMessages },
        conversationId,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "timeout") {
        return res.status(504).json({ error: "timeout" });
      }

      return next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(error);
    }
    if (error instanceof SyntaxError && "body" in error) {
      return res.status(400).json({ error: "invalid_body", message: "Malformed JSON body" });
    }
    console.error(error);
    return res.status(500).json({ error: "internal_error" });
  });

  return app;
}

export function startServer(port = Number(process.env.PORT ?? 3000)) {
  const app = createApp();
  return app.listen(port, () => {
    console.log(`OpsPilot HTTP server running on http://localhost:${port}`);
  });
}

if (process.argv[1]?.endsWith("server.ts")) {
  startServer();
}
