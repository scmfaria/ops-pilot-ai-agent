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

export class MemoryOpsStore {
  private services: ServiceRecord[];
  private alerts: AlertRecord[];

  constructor(initialServices: ServiceRecord[] = [], initialAlerts: AlertRecord[] = []) {
    this.services = [...initialServices];
    this.alerts = [...initialAlerts];
  }

  seedPrimaryData(): this {
    this.services = [
      { id: "svc-1", name: "api-gateway", owner: "platform", status: "degraded" },
      { id: "svc-2", name: "payments", owner: "finance", status: "healthy" },
      { id: "svc-3", name: "database", owner: "data", status: "warning" },
      { id: "svc-4", name: "redis-cache", owner: "infra", status: "healthy" },
      { id: "svc-5", name: "frontend", owner: "product", status: "healthy" },
    ];

    this.alerts = [
      {
        id: "alert-1001",
        title: "High latency in api-gateway",
        service: "api-gateway",
        severity: "critical",
        status: "firing",
        createdAt: "2026-09-29T12:00:00.000Z",
        updatedAt: "2026-09-29T12:00:00.000Z",
      },
      {
        id: "alert-1002",
        title: "Database connection saturation",
        service: "database",
        severity: "high",
        status: "firing",
        createdAt: "2026-09-29T12:10:00.000Z",
        updatedAt: "2026-09-29T12:10:00.000Z",
      },
      {
        id: "alert-1003",
        title: "Redis cache miss spike",
        service: "redis-cache",
        severity: "medium",
        status: "firing",
        createdAt: "2026-09-29T12:24:00.000Z",
        updatedAt: "2026-09-29T12:24:00.000Z",
      },
      {
        id: "alert-1004",
        title: "Payments API recovered after timeout",
        service: "payments",
        severity: "low",
        status: "resolved",
        createdAt: "2026-09-29T11:20:00.000Z",
        updatedAt: "2026-09-29T11:40:00.000Z",
      },
      {
        id: "alert-1005",
        title: "Frontend dependency degraded",
        service: "frontend",
        severity: "medium",
        status: "resolved",
        createdAt: "2026-09-29T10:59:00.000Z",
        updatedAt: "2026-09-29T11:15:00.000Z",
      },
      {
        id: "alert-1006",
        title: "API Gateway request queue cleared",
        service: "api-gateway",
        severity: "high",
        status: "resolved",
        createdAt: "2026-09-29T09:42:00.000Z",
        updatedAt: "2026-09-29T09:55:00.000Z",
      },
    ];

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
