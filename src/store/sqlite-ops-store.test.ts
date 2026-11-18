import test from "node:test";
import assert from "node:assert/strict";
import { SqliteOpsStore } from "./sqlite-ops-store.js";

test("sqlite store seeds 5 services and 6 alerts in memory", () => {
  const store = new SqliteOpsStore(":memory:");

  assert.equal(store.listServices().length, 5);
  assert.equal(store.listAlerts("all").length, 6);
  assert.equal(store.listAlerts("firing").length, 3);
  assert.equal(store.listAlerts("resolved").length, 3);
  assert.equal(store.listIncidents("open").length, 3);
  assert.equal(store.listIncidents("resolved").length, 3);
  assert.ok(store.getRunbook("payments"));
  assert.ok(store.getRunbook("auth"));
});

test("sqlite store opens and resolves incidents and filters by status", () => {
  const store = new SqliteOpsStore(":memory:");

  const created = store.openIncident("Queue backlog on web", "frontend", "high");
  assert.equal(created.status, "firing");
  assert.equal(store.listAlerts("firing").length, 4);
  assert.equal(store.listIncidents("open").length, 4);

  const resolved = store.resolveIncident(created.id);
  assert.equal(resolved?.status, "resolved");
  assert.equal(store.listAlerts("resolved").length, 4);
  assert.equal(store.listIncidents("resolved").length, 4);
  assert.equal(store.listIncidents("open").length, 3);
});

test("sqlite store validates closed domain enums in DDL", () => {
  const store = new SqliteOpsStore(":memory:");

  assert.throws(() => {
    store.openIncident("Invalid severity", "frontend", "urgent" as never);
  }, /CHECK|invalid|severity/i);
});

test("sqlite store persists conversation history per conversation in memory", () => {
  const store = new SqliteOpsStore(":memory:");

  const first = store.createConversation();
  store.appendMessage(first.id, "user", "hello");
  store.appendMessage(first.id, "assistant", "hi there");

  const second = store.createConversation();
  store.appendMessage(second.id, "user", "other");

  assert.equal(store.lastMessages(first.id).length, 2);
  assert.equal(store.lastMessages(first.id, 1)[0]?.content, "hi there");
  assert.equal(store.lastMessages(second.id).length, 1);
  assert.equal(store.lastMessages(second.id, 1)[0]?.content, "other");
});
