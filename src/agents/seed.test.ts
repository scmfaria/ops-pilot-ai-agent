import test from "node:test";
import assert from "node:assert/strict";
import { createSeedStore } from "./store.js";
import { formatTrace } from "./trace.js";
import type { TraceEvent } from "./types.js";

test("memory store seeds 5 services and 6 alerts", () => {
  const store = createSeedStore();

  assert.equal(store.listServices().length, 5);
  assert.equal(store.listAlerts("all").length, 6);
  assert.equal(store.listAlerts("firing").length, 3);
  assert.equal(store.listAlerts("resolved").length, 3);
});

test("open incident and resolve incident mutate state", () => {
  const store = createSeedStore();

  const created = store.openIncident("Queue backlog on web", "frontend", "high");
  assert.equal(created.status, "firing");
  assert.equal(store.listAlerts("firing").length, 4);

  const resolved = store.resolveIncident(created.id);
  assert.equal(resolved?.status, "resolved");
  assert.equal(store.listAlerts("resolved").length, 4);
});

test("trace formatting is deterministic", () => {
  const trace: TraceEvent[] = [
    { type: "thought", step: 1, content: "Start" },
    { type: "action", step: 2, tool: "list_alerts", args: { status: "firing" } },
    { type: "answer", step: 3, content: "Found 3 alerts" },
  ];

  assert.equal(
    formatTrace(trace),
    "[thought:1] Start\n[action:2] list_alerts({\"status\":\"firing\"})\n[answer:3] Found 3 alerts",
  );
});
