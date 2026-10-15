import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { resolveStrategy } from "../agents/index.js";

const chatBodySchema = z.object({
  message: z.string().min(1, "message is required"),
  strategy: z.string().default("react"),
  reflect: z.boolean().default(false),
});

export const app = express();
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

    const { message, strategy, reflect } = parsed.data;

    let strategyInstance;
    try {
      strategyInstance = resolveStrategy(strategy, reflect);
    } catch (error) {
      return res.status(422).json({
        error: "unknown_strategy",
        message: error instanceof Error ? error.message : "Unknown strategy",
      });
    }

    const timeoutMs = 180_000;
    const resultPromise = strategyInstance.run(message, { maxIterations: 6 });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });

    const result = await Promise.race([resultPromise, timeoutPromise]);

    return res.status(200).json({
      answer: result.answer,
      trace: result.trace,
      metrics: result.metrics,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "timeout") {
      return res.status(504).json({ error: "timeout" });
    }

    return next(error);
  }
});

export function startServer(port = Number(process.env.PORT ?? 3000)) {
  return app.listen(port, () => {
    console.log(`OpsPilot HTTP server running on http://localhost:${port}`);
  });
}

if (process.argv[1]?.endsWith("server.ts")) {
  startServer();
}
