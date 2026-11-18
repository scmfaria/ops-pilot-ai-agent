import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createOpsTools } from "../agents/tools.js";
import type { OpsStore } from "../store/ops-store.js";
import { createSeedStore } from "../agents/store.js";

export type McpServerOptions = {
  store?: OpsStore;
};

export function createOpsPilotMcpServer(options: McpServerOptions = {}) {
  const store = options.store ?? createSeedStore();
  const { listAlertsTool, openIncidentTool, resolveIncidentTool } = createOpsTools(store);

  const server = new McpServer(
    {
      name: "opspilot",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.registerTool("list_alerts", {
    description: listAlertsTool.description,
    inputSchema: listAlertsTool.schema,
  }, async (args) => {
    const parsed = listAlertsTool.schema.parse(args ?? {});
    const result = await listAlertsTool.invoke(parsed);
    return {
      content: [{ type: "text", text: String(result) }],
    };
  });

  server.registerTool("open_incident", {
    description: openIncidentTool.description,
    inputSchema: openIncidentTool.schema,
  }, async (args) => {
    const parsed = openIncidentTool.schema.parse(args ?? {});
    const result = await openIncidentTool.invoke(parsed);
    return {
      content: [{ type: "text", text: String(result) }],
    };
  });

  server.registerTool("resolve_incident", {
    description: resolveIncidentTool.description,
    inputSchema: resolveIncidentTool.schema,
  }, async (args) => {
    const parsed = resolveIncidentTool.schema.parse(args ?? {});
    const result = await resolveIncidentTool.invoke(parsed);
    return {
      content: [{ type: "text", text: String(result) }],
    };
  });

  return server;
}

export async function startMcpServer(options: McpServerOptions = {}) {
  const server = createOpsPilotMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}

async function main() {
  process.stderr.write("[opspilot-mcp] starting stdio server\n");
  await startMcpServer();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[opspilot-mcp] failed to start: ${message}\n`);
    process.exit(1);
  });
}
