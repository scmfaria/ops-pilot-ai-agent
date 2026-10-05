import { ChatOpenAI } from "@langchain/openai";

export const OPEN_ROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function createModel(modelName?: string, apiKey?: string) {
  const resolvedModelName =
    modelName ??
    process.env.OPENROUTER_MODEL ??
    process.env.OPEN_ROUTER_MODEL ??
    "openai/gpt-4o-mini";

  const resolvedApiKey =
    apiKey ??
    process.env.OPENROUTER_API_KEY ??
    process.env.OPEN_ROUTER_API_KEY ??
    "demo-key";

  return new ChatOpenAI({
    model: resolvedModelName,
    apiKey: resolvedApiKey,
    temperature: 0,
    configuration: {
      baseURL:
        process.env.OPENROUTER_BASE_URL ??
        process.env.OPEN_ROUTER_BASE_URL ??
        OPEN_ROUTER_BASE_URL,
    },
  });
}

export const createOpenRouterModel = createModel;
export const createDefaultModel = createModel;
