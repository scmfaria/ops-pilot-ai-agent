import { chatResponseSchema, type ChatResponse } from "./chat-contract";
import { chatUrl } from "./api-config";

export type ChatError = Error & { status?: number };

export async function sendChat(apiUrl: string, body: { message: string; strategy: string; reflect: boolean; conversationId?: string }): Promise<ChatResponse & { status: number }> {
  let response: Response;
  try {
    response = await fetch(chatUrl(apiUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error("Não foi possível alcançar a API. Verifique a URL e a configuração de CORS."), { status: 0 });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "A requisição foi rejeitada pela API.",
      422: "A estratégia selecionada não é suportada.",
      504: "A API excedeu o tempo limite.",
      500: "Ocorreu um erro interno na API.",
    };
    throw Object.assign(new Error(messages[response.status] ?? `A API respondeu com o status ${response.status}.`), { status: response.status });
  }

  const parsed = chatResponseSchema.safeParse(data);
  if (!parsed.success) throw Object.assign(new Error("A API retornou dados em formato inesperado."), { status: response.status });
  return { ...parsed.data, status: response.status };
}
