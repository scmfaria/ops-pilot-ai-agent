import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createOpsPilotMcpServer } from "./server.js";
import { createSeedStore } from "../agents/store.js";

function getTextPayload(result: { content?: unknown } | { toolResult?: unknown }): string {
  const content = "content" in result && Array.isArray(result.content) ? result.content : [];
  const firstText = content.find((item: unknown) => {
    if (typeof item !== "object" || item === null || !("type" in item)) {
      return false;
    }

    return (item as { type?: string }).type === "text";
  }) as { text?: string } | undefined;

  return firstText?.text ?? "[]";
}

test("MCP server exposes the expected OpsPilot operational tools", async () => {
  const store = createSeedStore();
  const server = createOpsPilotMcpServer({ store });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name).sort();

  assert.deepEqual(names, ["list_alerts", "open_incident", "resolve_incident"]);
  assert.equal(client.getServerVersion()?.name, "opspilot");
});

test("MCP list_alerts uses the same store state and validation as the app tools", async () => {
  const store = createSeedStore();
  const server = createOpsPilotMcpServer({ store });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const result = await client.callTool({
    name: "list_alerts",
    arguments: { status: "all" },
  });

  assert.equal(result.isError, undefined);
  const payload = JSON.parse(getTextPayload(result));
  assert.ok(Array.isArray(payload));
  assert.equal(payload.length, store.listAlerts("all").length);
});

test("MCP open_incident and resolve_incident mutate the shared store", async () => {
  const store = createSeedStore();
  const server = createOpsPilotMcpServer({ store });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const opened = await client.callTool({
    name: "open_incident",
    arguments: {
      title: "Database latency spike",
      service: "payments",
      severity: "high",
    },
  });
  const openPayload = JSON.parse(getTextPayload(opened));
  assert.equal(openPayload.ok, true);
  assert.equal(store.listAlerts("firing").some((alert) => alert.title === "Database latency spike"), true);

  const resolved = await client.callTool({
    name: "resolve_incident",
    arguments: { id: openPayload.alert.id },
  });
  const resolvedPayload = JSON.parse(getTextPayload(resolved));
  assert.equal(resolvedPayload.ok, true);
  assert.equal(store.listAlerts("resolved").some((alert) => alert.id === openPayload.alert.id), true);
});
