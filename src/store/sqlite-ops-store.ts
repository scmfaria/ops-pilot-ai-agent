import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AlertRecord, AlertStatus, ConversationMessage, ConversationRecord, ConversationRole, IncidentRecord, IncidentStatus, OpsStore, RunbookRecord, ServiceRecord } from "./ops-store.js";

const DEFAULT_SERVICE_SEED: ServiceRecord[] = [
  { id: "svc-1", name: "api-gateway", owner: "platform", status: "degraded", tier: "critical" },
  { id: "svc-2", name: "payments", owner: "finance", status: "healthy", tier: "critical" },
  { id: "svc-3", name: "database", owner: "data", status: "warning", tier: "critical" },
  { id: "svc-4", name: "redis-cache", owner: "infra", status: "healthy", tier: "standard" },
  { id: "svc-5", name: "frontend", owner: "product", status: "healthy", tier: "standard" },
];

const DEFAULT_ALERT_SEED: AlertRecord[] = [
  { id: "alert-1001", title: "High latency in api-gateway", service: "api-gateway", severity: "critical", status: "firing", createdAt: "2026-09-29T12:00:00.000Z", updatedAt: "2026-09-29T12:00:00.000Z" },
  { id: "alert-1002", title: "Database connection saturation", service: "database", severity: "high", status: "firing", createdAt: "2026-09-29T12:10:00.000Z", updatedAt: "2026-09-29T12:10:00.000Z" },
  { id: "alert-1003", title: "Redis cache miss spike", service: "redis-cache", severity: "medium", status: "firing", createdAt: "2026-09-29T12:24:00.000Z", updatedAt: "2026-09-29T12:24:00.000Z" },
  { id: "alert-1004", title: "Payments API recovered after timeout", service: "payments", severity: "low", status: "resolved", createdAt: "2026-09-29T11:20:00.000Z", updatedAt: "2026-09-29T11:40:00.000Z" },
  { id: "alert-1005", title: "Frontend dependency degraded", service: "frontend", severity: "medium", status: "resolved", createdAt: "2026-09-29T10:59:00.000Z", updatedAt: "2026-09-29T11:15:00.000Z" },
  { id: "alert-1006", title: "API Gateway request queue cleared", service: "api-gateway", severity: "high", status: "resolved", createdAt: "2026-09-29T09:42:00.000Z", updatedAt: "2026-09-29T09:55:00.000Z" },
];

const DEFAULT_RUNBOOK_SEED = [
  {
    id: "rb-1",
    service: "payments",
    name: "Payments recovery checklist",
    summary: "Verifica falhas em pagamentos, confirma fila e restaura throughput antes de voltar ao normal.",
    steps: "1. Confirmar fila de pagamentos; 2. Validar limites de concorrência; 3. Verificar health da API; 4. Resolver backlog; 5. Validar retry.",
    createdAt: "2026-09-29T09:00:00.000Z",
  },
  {
    id: "rb-2",
    service: "auth",
    name: "Auth outage checklist",
    summary: "Confirma serviço de autenticação, revisa tokens e valida latência e risco de sessão.",
    steps: "1. Verificar uptime do auth; 2. Validar refresh token; 3. Revisar bloqueios por rate limit; 4. Reabilitar tokens; 5. Confirmar login.",
    createdAt: "2026-09-29T09:15:00.000Z",
  },
];

export class SqliteOpsStore implements OpsStore {
  private readonly db: DatabaseSync;

  constructor(path = process.env.OPSPILOT_DB ?? "./data/opspilot.db") {
    if (path !== ":memory:" && path !== "file::memory:?cache=shared") {
      mkdirSync(dirname(path), { recursive: true });
    }
    this.db = new DatabaseSync(path);
    this.bootstrapSchema();
    this.seedPrimaryData();
  }

  private bootstrapSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        owner TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'warning')),
        tier TEXT NOT NULL CHECK (tier IN ('critical', 'standard', 'legacy')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        service TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
        status TEXT NOT NULL CHECK (status IN ('firing', 'resolved')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        service TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
        status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        summary TEXT
      );

      CREATE TABLE IF NOT EXISTS runbooks (
        id TEXT PRIMARY KEY,
        service TEXT NOT NULL,
        name TEXT NOT NULL,
        summary TEXT NOT NULL,
        steps TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );
    `);
  }

  createConversation(): ConversationRecord {
    const id = `conv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    this.db.prepare("INSERT INTO conversations (id, created_at) VALUES (?, ?)").run(id, createdAt);
    return { id, createdAt };
  }

  appendMessage(conversationId: string, role: ConversationRole, content: string): ConversationMessage {
    const id = `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    this.db.prepare(
      "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(id, conversationId, role, content, createdAt);

    return { id, conversationId, role, content, createdAt };
  }

  lastMessages(conversationId: string, limit = 12): ConversationMessage[] {
    const rows = this.db.prepare(
      "SELECT id, conversation_id AS conversationId, role, content, created_at AS createdAt FROM messages WHERE conversation_id = ? ORDER BY rowid DESC LIMIT ?",
    ).all(conversationId, limit) as Array<ConversationMessage>;

    return rows.reverse();
  }

  seedPrimaryData(): void {
    const insertService = this.db.prepare(
      "INSERT OR IGNORE INTO services (id, name, owner, status, tier) VALUES (?, ?, ?, ?, ?)",
    );
    for (const service of DEFAULT_SERVICE_SEED) {
      insertService.run(service.id, service.name, service.owner, service.status, service.tier ?? "standard");
    }

    const insertAlert = this.db.prepare(
      "INSERT OR IGNORE INTO alerts (id, title, service, severity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const alert of DEFAULT_ALERT_SEED) {
      insertAlert.run(alert.id, alert.title, alert.service, alert.severity, alert.status, alert.createdAt, alert.updatedAt);
    }

    const insertIncident = this.db.prepare(
      "INSERT OR IGNORE INTO incidents (id, title, service, severity, status, created_at, resolved_at, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const alert of DEFAULT_ALERT_SEED) {
      const status: IncidentStatus = alert.status === "firing" ? "open" : "resolved";
      insertIncident.run(
        alert.id,
        alert.title,
        alert.service,
        alert.severity,
        status,
        alert.createdAt,
        alert.status === "resolved" ? alert.updatedAt : null,
        alert.title,
      );
    }

    const insertRunbook = this.db.prepare(
      "INSERT OR IGNORE INTO runbooks (id, service, name, summary, steps, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const runbook of DEFAULT_RUNBOOK_SEED) {
      insertRunbook.run(runbook.id, runbook.service, runbook.name, runbook.summary, runbook.steps, runbook.createdAt);
    }
  }

  listServices(): ServiceRecord[] {
    const stmt = this.db.prepare("SELECT id, name, owner, status, tier FROM services ORDER BY name ASC");
    return stmt.all() as ServiceRecord[];
  }

  listAlerts(status?: AlertStatus | "all"): AlertRecord[] {
    if (!status || status === "all") {
      const stmt = this.db.prepare("SELECT id, title, service, severity, status, created_at AS createdAt, updated_at AS updatedAt FROM alerts ORDER BY created_at DESC");
      return stmt.all() as AlertRecord[];
    }

    const stmt = this.db.prepare(
      "SELECT id, title, service, severity, status, created_at AS createdAt, updated_at AS updatedAt FROM alerts WHERE status = ? ORDER BY created_at DESC",
    );
    return stmt.all(status) as AlertRecord[];
  }

  listIncidents(status: IncidentStatus = "open"): IncidentRecord[] {
    if (status === "all") {
      const stmt = this.db.prepare(
        "SELECT id, title, service, severity, status, created_at AS createdAt, resolved_at AS resolvedAt, summary FROM incidents ORDER BY created_at DESC",
      );
      return stmt.all() as IncidentRecord[];
    }

    const stmt = this.db.prepare(
      "SELECT id, title, service, severity, status, created_at AS createdAt, resolved_at AS resolvedAt, summary FROM incidents WHERE status = ? ORDER BY created_at DESC",
    );
    return stmt.all(status) as IncidentRecord[];
  }

  openIncident(title: string, service: string, severity: AlertRecord["severity"]): AlertRecord {
    const now = new Date().toISOString();
    const id = `alert-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const alert: AlertRecord = {
      id,
      title,
      service,
      severity,
      status: "firing",
      createdAt: now,
      updatedAt: now,
    };

    this.db.prepare(
      "INSERT INTO alerts (id, title, service, severity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(id, title, service, severity, "firing", now, now);

    this.db.prepare(
      "INSERT INTO incidents (id, title, service, severity, status, created_at, resolved_at, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(id, title, service, severity, "open", now, null, title);

    return alert;
  }

  resolveIncident(id: string): AlertRecord | null {
    const current = this.db.prepare(
      "SELECT id, title, service, severity, status, created_at AS createdAt, updated_at AS updatedAt FROM alerts WHERE id = ?",
    ).get(id) as AlertRecord | undefined;

    if (!current) {
      return null;
    }

    const now = new Date().toISOString();
    const resolved: AlertRecord = {
      ...current,
      status: "resolved",
      updatedAt: now,
    };

    this.db.prepare(
      "UPDATE alerts SET status = ?, updated_at = ? WHERE id = ?",
    ).run("resolved", now, id);

    this.db.prepare(
      "UPDATE incidents SET status = ?, resolved_at = ? WHERE id = ?",
    ).run("resolved", now, id);

    return resolved;
  }

  getRunbook(service: string): RunbookRecord | null {
    const stmt = this.db.prepare(
      "SELECT id, service, name, summary, steps, created_at AS createdAt FROM runbooks WHERE service = ? ORDER BY created_at DESC LIMIT 1",
    );
    return (stmt.get(service) as RunbookRecord | undefined) ?? null;
  }
}

export function createSqliteOpsStore(path = process.env.OPSPILOT_DB ?? "./data/opspilot.db") {
  return new SqliteOpsStore(path);
}
