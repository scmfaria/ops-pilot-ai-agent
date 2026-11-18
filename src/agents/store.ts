import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ConversationMessage, ConversationRecord, ConversationRole, IncidentRecord, OpsStore, RunbookRecord } from "../store/ops-store.js";

export type AlertStatus = "firing" | "resolved";

export type ServiceRecord = {
  id: string;
  name: string;
  owner: string;
  status: "healthy" | "degraded" | "warning";
  tier?: "critical" | "standard" | "legacy";
};

export type AlertRecord = {
  id: string;
  title: string;
  service: string;
  severity: "critical" | "high" | "medium" | "low";
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const seedDataPath = join(currentDir, "seed-data.json");
const seedData = JSON.parse(readFileSync(seedDataPath, "utf-8")) as {
  services: ServiceRecord[];
  alerts: AlertRecord[];
};

const runbookSeed: RunbookRecord[] = [
  {
    id: "rb-1",
    service: "payments",
    name: "Payments recovery checklist",
    summary: "Confirm payment queue, verify API health, recover throughput and validate retries.",
    steps: "1. Check payment queue; 2. Verify API health; 3. Clear bottleneck; 4. Validate retries; 5. Confirm recovery.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rb-2",
    service: "auth",
    name: "Auth outage checklist",
    summary: "Check login tokens, auth service health, and user session validity before re-enable.",
    steps: "1. Confirm auth service health; 2. Inspect token generation; 3. Validate session state; 4. Resume auth flow; 5. Verify user login.",
    createdAt: new Date().toISOString(),
  },
];

export class MemoryOpsStore implements OpsStore {
  private services: ServiceRecord[];
  private alerts: AlertRecord[];
  private runbooks: RunbookRecord[];
  private conversations: Map<string, ConversationMessage[]>;

  constructor(initialServices: ServiceRecord[] = [], initialAlerts: AlertRecord[] = []) {
    this.services = [...initialServices];
    this.alerts = [...initialAlerts];
    this.runbooks = [...runbookSeed];
    this.conversations = new Map();
  }

  seedPrimaryData(): this {
    this.services = structuredClone(seedData.services);
    this.alerts = structuredClone(seedData.alerts);
    this.runbooks = structuredClone(runbookSeed);
    return this;
  }

  listServices(): ServiceRecord[] {
    return [...this.services];
  }

  listAlerts(status?: AlertStatus | "all"): AlertRecord[] {
    if (!status || status === "all") {
      return [...this.alerts];
    }

    return this.alerts.filter((alert) => alert.status === status);
  }

  listIncidents(status: "open" | "resolved" | "all" = "open"): IncidentRecord[] {
    const incidents = this.alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      service: alert.service,
      severity: alert.severity,
      status: alert.status === "firing" ? "open" : "resolved",
      createdAt: alert.createdAt,
      resolvedAt: alert.status === "resolved" ? alert.updatedAt : null,
      summary: alert.title,
    } as IncidentRecord));

    if (status === "all") {
      return incidents;
    }

    return incidents.filter((incident) => incident.status === status);
  }

  openIncident(title: string, service: string, severity: AlertRecord["severity"]): AlertRecord {
    const now = new Date().toISOString();
    const incident: AlertRecord = {
      id: `alert-${Date.now()}`,
      title,
      service,
      severity,
      status: "firing",
      createdAt: now,
      updatedAt: now,
    };

    this.alerts.unshift(incident);
    return { ...incident };
  }

  resolveIncident(id: string): AlertRecord | null {
    const index = this.alerts.findIndex((alert) => alert.id === id);

    if (index === -1) {
      return null;
    }

    this.alerts[index] = {
      ...this.alerts[index],
      status: "resolved",
      updatedAt: new Date().toISOString(),
    };

    return { ...this.alerts[index] };
  }

  getRunbook(service: string): RunbookRecord | null {
    return this.runbooks.find((runbook) => runbook.service === service) ?? null;
  }

  createConversation(): ConversationRecord {
    const id = `conv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    this.conversations.set(id, []);
    return { id, createdAt };
  }

  appendMessage(conversationId: string, role: ConversationRole, content: string): ConversationMessage {
    const existing = this.conversations.get(conversationId) ?? [];
    const createdAt = new Date().toISOString();
    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      conversationId,
      role,
      content,
      createdAt,
    };

    this.conversations.set(conversationId, [...existing, message]);
    return message;
  }

  lastMessages(conversationId: string, limit = 12): ConversationMessage[] {
    const history = this.conversations.get(conversationId) ?? [];
    return history.slice(-limit);
  }
}

export function createSeedStore() {
  return new MemoryOpsStore().seedPrimaryData();
}

export const defaultOpsStore = createSeedStore();
