import { ChatOpenAI } from "@langchain/openai";

export const OPEN_ROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function hasOpenRouterCredentials(apiKey?: string) {
  const resolvedApiKey = apiKey ?? process.env.OPENROUTER_API_KEY ?? process.env.OPEN_ROUTER_API_KEY;
  return Boolean(resolvedApiKey && resolvedApiKey.trim() && resolvedApiKey !== "demo-key" && resolvedApiKey !== "mock-key");
}

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
    "";

  if (!hasOpenRouterCredentials(resolvedApiKey)) {
    return null;
  }

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
