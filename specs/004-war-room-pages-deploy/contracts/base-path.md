# Contract: `resolveBasePath`

Arquivo: `web/base-path.ts` — função pura, sem I/O; consumida por `web/vite.config.ts` como `resolveBasePath(process.env.VITE_BASE)`.

```ts
export const DEFAULT_BASE_PATH = "/opspilot/";
export function resolveBasePath(raw: string | undefined): string;
```

## Comportamento

| Entrada | Saída |
|---|---|
| `undefined` | `/opspilot/` |
| `""` ou só espaços | `/opspilot/` |
| `"/ops-pilot-ai-agent/"` | `/ops-pilot-ai-agent/` |
| `"ops-pilot-ai-agent"` | `/ops-pilot-ai-agent/` |
| `" /a/b "` | `/a/b/` |
| `"//a///b//"` | `/a/b/` |
| `"/"` | `/` |
| `"https://x.com/a/"` | lança `Error` (esquema não permitido) |
| `"/a/../b/"` | lança `Error` (`..` não permitido) |
| `"/a b/"` | lança `Error` (espaço interno não permitido) |

Erros têm mensagem que cita `VITE_BASE` e o valor recebido, para aparecer claramente no log do build.
