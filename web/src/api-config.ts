export const API_URL_KEY = "opspilot.apiUrl";
export const DEFAULT_API_URL = "http://localhost:3000";

export function normalizeApiUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function validateApiUrl(value: string): string | null {
  const normalized = normalizeApiUrl(value);
  if (!normalized) return "Informe a URL da API.";
  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "Use uma URL HTTP ou HTTPS.";
    return null;
  } catch {
    return "Informe uma URL válida.";
  }
}

export function getApiUrl(): string {
  return localStorage.getItem(API_URL_KEY) ?? DEFAULT_API_URL;
}

export function saveApiUrl(value: string): void {
  localStorage.setItem(API_URL_KEY, normalizeApiUrl(value));
}

export function chatUrl(value: string): string {
  return `${normalizeApiUrl(value)}/chat`;
}
