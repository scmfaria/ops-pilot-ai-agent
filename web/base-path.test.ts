import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BASE_PATH, resolveBasePath } from "./base-path.ts";

test("falls back to /opspilot/ when VITE_BASE is missing or blank", () => {
  assert.equal(DEFAULT_BASE_PATH, "/opspilot/");
  assert.equal(resolveBasePath(undefined), "/opspilot/");
  assert.equal(resolveBasePath(""), "/opspilot/");
  assert.equal(resolveBasePath("   "), "/opspilot/");
});

test("adds leading and trailing slashes", () => {
  assert.equal(resolveBasePath("ops-pilot-ai-agent"), "/ops-pilot-ai-agent/");
  assert.equal(resolveBasePath("/ops-pilot-ai-agent/"), "/ops-pilot-ai-agent/");
  assert.equal(resolveBasePath(" /a/b "), "/a/b/");
});

test("collapses repeated slashes", () => {
  assert.equal(resolveBasePath("//a///b//"), "/a/b/");
  assert.equal(resolveBasePath("/"), "/");
});

test("rejects unsafe values with a message citing VITE_BASE", () => {
  for (const value of ["https://x.com/a/", "/a/../b/", "/a b/"]) {
    assert.throws(
      () => resolveBasePath(value),
      (error: unknown) =>
        error instanceof Error && error.message.includes("VITE_BASE") && error.message.includes(value),
    );
  }
});
