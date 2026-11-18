import test from "node:test";
import assert from "node:assert/strict";
import { checkProviderStatusWithFetch } from "./tools.js";

const buildJsonResponse = (payload: unknown, ok = true) =>
  new Response(JSON.stringify(payload), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });

test("checkProviderStatusWithFetch returns compact status for a valid provider response", async () => {
  const fetchImpl = async () =>
    buildJsonResponse({
      status: {
        indicator: "none",
        description: "All systems operational",
      },
    });

  const result = await checkProviderStatusWithFetch("github", fetchImpl);

  assert.deepEqual(result, {
    provider: "github",
    indicator: "none",
    description: "All systems operational",
  });
});

test("checkProviderStatusWithFetch retries on timeout and returns readable error when final failure happens", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts < 2) {
      throw new DOMException("timeout", "TimeoutError");
    }

    return buildJsonResponse(
      {
        status: {
          indicator: "major",
          description: "Partial outage",
        },
      },
    );
  };

  const result = await checkProviderStatusWithFetch("cloudflare", fetchImpl);
  assert.equal(result.provider, "cloudflare");
  assert.equal(result.indicator, "major");
  assert.equal(result.description, "Partial outage");
});

test("checkProviderStatusWithFetch returns readable invalid payload result without throwing", async () => {
  const fetchImpl = async () =>
    buildJsonResponse({
      wrong: {
        description: "bad payload",
      },
    });

  const result = await checkProviderStatusWithFetch("github", fetchImpl);
  assert.equal(result.indicator, "error");
  assert.match(result.description, /Invalid provider status payload|Provider status unavailable/i);
});
