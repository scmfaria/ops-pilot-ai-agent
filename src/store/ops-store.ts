export type AlertStatus = "firing" | "resolved";
export type IncidentStatus = "open" | "resolved" | "all";

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

export type IncidentRecord = {
  id: string;
  title: string;
  service: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
  summary: string | null;
};

export type RunbookRecord = {
  id: string;
  service: string;
  name: string;
  summary: string;
  steps: string;
  createdAt: string;
};

export type ConversationRecord = {
  id: string;
  createdAt: string;
};

export type ConversationRole = "user" | "assistant";

export type ConversationMessage = {
  id: string;
  conversationId: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
};

export interface ConversationStore {
  createConversation(): ConversationRecord;
  appendMessage(conversationId: string, role: ConversationRole, content: string): ConversationMessage;
  lastMessages(conversationId: string, limit?: number): ConversationMessage[];
}

export interface OpsStore extends ConversationStore {
  listServices(): ServiceRecord[];
  listAlerts(status?: AlertStatus | "all"): AlertRecord[];
  listIncidents(status?: IncidentStatus): IncidentRecord[];
  openIncident(title: string, service: string, severity: AlertRecord["severity"]): AlertRecord;
  resolveIncident(id: string): AlertRecord | null;
  getRunbook(service: string): RunbookRecord | null;
}
