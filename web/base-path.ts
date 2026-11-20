// Resolve a base pública da SPA a partir de VITE_BASE (spec 004).
// Função pura, sem I/O; usa só sintaxe TS apagável para rodar com type stripping do Node.

export const DEFAULT_BASE_PATH = "/opspilot/";

export function resolveBasePath(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (value === "") return DEFAULT_BASE_PATH;

  const invalid = (reason: string) => new Error(`VITE_BASE inválido (${reason}): "${raw}"`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) throw invalid("não use esquema/URL completa, apenas o caminho");
  if (/\s/.test(value)) throw invalid("não pode conter espaços");
  if (value.split("/").includes("..")) throw invalid("não pode conter '..'");

  const segments = value.split("/").filter(Boolean);
  return segments.length === 0 ? "/" : `/${segments.join("/")}/`;
}
