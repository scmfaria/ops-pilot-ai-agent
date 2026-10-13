import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type AlertStatus = "firing" | "resolved";

export type ServiceRecord = {
  id: string;
  name: string;
  owner: string;
  status: "healthy" | "degraded" | "warning";
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

export class MemoryOpsStore {
  private services: ServiceRecord[];
  private alerts: AlertRecord[];

  constructor(initialServices: ServiceRecord[] = [], initialAlerts: AlertRecord[] = []) {
    this.services = [...initialServices];
    this.alerts = [...initialAlerts];
  }

  seedPrimaryData(): this {
    this.services = structuredClone(seedData.services);
    this.alerts = structuredClone(seedData.alerts);
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
}

export function createSeedStore() {
  return new MemoryOpsStore().seedPrimaryData();
}

export const defaultOpsStore = createSeedStore();
