import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createSeedStore } from "./store.js";
import type { AlertRecord, AlertStatus, MemoryOpsStore } from "./store.js";
import type { OpsStore } from "../store/ops-store.js";

export const store = createSeedStore();

export type ProviderName = "github" | "cloudflare";

const providerUrls: Record<ProviderName, string> = {
  github: "https://www.githubstatus.com/api/v2/status.json",
  cloudflare: "https://www.cloudflarestatus.com/api/v2/status.json",
};

const providerStatusSchema = z.object({
  status: z.object({
    indicator: z.enum(["none", "minor", "major", "critical", "maintenance", "degraded_performance"]),
    description: z.string().min(1),
  }),
});

export type ProviderStatusCheck = {
  provider: ProviderName;
  indicator: string;
  description: string;
};

export async function checkProviderStatusWithFetch(
  provider: ProviderName = "github",
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<ProviderStatusCheck> {
  const url = providerUrls[provider];
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetchImpl(url, { signal: controller.signal });
      const raw = await response.json();
      const parsed = providerStatusSchema.safeParse(raw);

      if (!parsed.success) {
        throw new Error("Invalid provider status payload");
      }

      if (!response.ok) {
        throw new Error(`Provider status endpoint returned ${response.status}`);
      }

      return {
        provider,
        indicator: parsed.data.status.indicator,
        description: parsed.data.status.description,
      };
    } catch (error) {
      if (error instanceof Error && /5\d\d|timeout|abort|network|fetch/i.test(error.message)) {
        lastError = error;
        if (attempt === 0) {
          continue;
        }
      }

      return {
        provider,
        indicator: "error",
        description: lastError instanceof Error ? lastError.message : "Provider status unavailable",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    provider,
    indicator: "error",
    description: lastError instanceof Error ? lastError.message : "Provider status unavailable",
  };
}

export function createOpsTools(currentStore: OpsStore = store, fetchImpl: typeof fetch = globalThis.fetch) {
  const listAlerts = tool(
    async ({ status }: { status?: AlertStatus | "all" }) => {
      return JSON.stringify(currentStore.listAlerts(status ?? "all"), null, 2);
    },
    {
      name: "list_alerts",
      description: "List incident alerts in the system. Use status: firing, resolved, or all. Return the full alert records for the selected state.",
      schema: z.object({
        status: z.enum(["firing", "resolved", "all"]).default("firing"),
      }),
    },
  );

  const openIncident = tool(
    async ({ title, service, severity }: { title: string; service: string; severity: AlertRecord["severity"] }) => {
      const alert = currentStore.openIncident(title, service, severity);
      return JSON.stringify({ ok: true, alert }, null, 2);
    },
    {
      name: "open_incident",
      description: "Open a new operational incident for a service. Use this when the alert is active and a new incident must be created. Required fields: title, service, severity.",
      schema: z.object({
        title: z.string().min(1),
        service: z.string().min(1),
        severity: z.enum(["critical", "high", "medium", "low"]),
      }),
    },
  );

  const resolveIncident = tool(
    async ({ id }: { id: string }) => {
      const alert = currentStore.resolveIncident(id);
      return JSON.stringify(
        alert
          ? { ok: true, alert }
          : { ok: false, message: `Incident ${id} not found` },
        null,
        2,
      );
    },
    {
      name: "resolve_incident",
      description: "Resolve an open incident by id. Use this once the fault is mitigated and the incident state must transition to resolved.",
      schema: z.object({
        id: z.string().min(1),
      }),
    },
  );

  const listIncidents = tool(
    async ({ status }: { status?: "open" | "resolved" | "all" }) => {
      const incidents = currentStore.listIncidents(status ?? "open");
      return JSON.stringify(incidents, null, 2);
    },
    {
      name: "list_incidents",
      description: "List operational incidents by state. Use status open for active incidents, resolved for closed ones, or all to query all records.",
      schema: z.object({
        status: z.enum(["open", "resolved", "all"]).default("open"),
      }),
    },
  );

  const consultarRunbook = tool(
    async ({ service }: { service: string }) => {
      const runbook = currentStore.getRunbook(service);
      return JSON.stringify(runbook ?? { ok: false, message: `No runbook found for service ${service}` }, null, 2);
    },
    {
      name: "consultar_runbook",
      description: "Fetch the operational runbook for a service. Use this to get recovery steps, escalation notes, and remediation guidance. Required field: service.",
      schema: z.object({
        service: z.string().min(1),
      }),
    },
  );

  const checkProviderStatus = tool(
    async ({ provider }: { provider?: ProviderName }) => {
      const status = await checkProviderStatusWithFetch(provider ?? "github", fetchImpl);
      return `${status.provider}: ${status.indicator} - ${status.description}`;
    },
    {
      name: "check_provider_status",
      description: "Check the public status page of an external provider. Use this when you suspect an outage outside our platform, need to distinguish provider issues from internal problems, or want to validate a dependency is healthy. provider: github | cloudflare. Default: github.",
      schema: z.object({
        provider: z.enum(["github", "cloudflare"]).default("github").describe("External provider to query. Use github for GitHub status or cloudflare for Cloudflare status. Default: github."),
      }),
    },
  );

  return {
    listAlerts,
    openIncident,
    resolveIncident,
    listIncidents,
    consultarRunbook,
    checkProviderStatus,
    opsTools: [listAlerts, openIncident, resolveIncident, listIncidents, consultarRunbook, checkProviderStatus],
    listAlertsTool: listAlerts,
    openIncidentTool: openIncident,
    resolveIncidentTool: resolveIncident,
    listIncidentsTool: listIncidents,
    consultarRunbookTool: consultarRunbook,
    checkProviderStatusTool: checkProviderStatus,
  };
}

export const {
  listAlerts,
  openIncident,
  resolveIncident,
  listIncidents,
  consultarRunbook,
  checkProviderStatus,
  opsTools,
  listAlertsTool,
  openIncidentTool,
  resolveIncidentTool,
  listIncidentsTool,
  consultarRunbookTool,
  checkProviderStatusTool,
} = createOpsTools();

export function resetOpsStore(resetStore: MemoryOpsStore | OpsStore = store) {
  if ("seedPrimaryData" in resetStore && typeof resetStore.seedPrimaryData === "function") {
    const maybeSeedStore = resetStore as MemoryOpsStore & { seedPrimaryData: () => unknown };
    maybeSeedStore.seedPrimaryData();
    return;
  }

  throw new Error("Unable to reset store: store does not support seedPrimaryData().");
}
