import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createSeedStore, type AlertRecord, type AlertStatus, type MemoryOpsStore } from "./store.js";

export const store = createSeedStore();

export const listAlerts = tool(
  async ({ status }: { status?: AlertStatus | "all" }) => {
    return JSON.stringify(store.listAlerts(status ?? "all"), null, 2);
  },
  {
    name: "list_alerts",
    description: "List incident alerts in the system. You can filter by status (firing, resolved, or all).",
    schema: z.object({
      status: z.enum(["firing", "resolved", "all"]).default("firing"),
    }),
  },
);

export const openIncident = tool(
  async ({ title, service, severity }: { title: string; service: string; severity: AlertRecord["severity"] }) => {
    const alert = store.openIncident(title, service, severity);
    return JSON.stringify({ ok: true, alert }, null, 2);
  },
  {
    name: "open_incident",
    description: "Open a new incident for a service.",
    schema: z.object({
      title: z.string().min(1),
      service: z.string().min(1),
      severity: z.enum(["critical", "high", "medium", "low"]),
    }),
  },
);

export const resolveIncident = tool(
  async ({ id }: { id: string }) => {
    const alert = store.resolveIncident(id);
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
    description: "Resolve an incident by id.",
    schema: z.object({
      id: z.string().min(1),
    }),
  },
);

export const opsTools = [listAlerts, openIncident, resolveIncident];

export const listAlertsTool = listAlerts;
export const openIncidentTool = openIncident;
export const resolveIncidentTool = resolveIncident;

export function resetOpsStore(resetStore: MemoryOpsStore = store) {
  resetStore.seedPrimaryData();
}
