import { parseArgs } from "node:util";
import { reactStrategy } from "./agents/react.js";
import { planAndExecuteStrategy } from "./agents/plan-and-execute.js";
import { resetOpsStore, store } from "./agents/tools.js";
import type { AlertRecord } from "./agents/store.js";

const scenarios = {
  c1: "quantos alertas criticos estao disponiveis?",
  c2: "abra tres incidentes sev2 para checkout, payment e catalog, nessa mesma ordem, e resolva o primeiro.",
  c3: "dos alertas disparando, abra um incidente para o mais antigo e diga quantos sobraram.",
} as const;

const strategies = {
  react: reactStrategy,
  "plan-and-execute": planAndExecuteStrategy,
} as const;

const { values } = parseArgs({
  options: {
    scenario: {
      type: "string",
      short: "s",
      default: "all",
    },
    "no-replanner": {
      type: "boolean",
      default: false,
    },
  },
  strict: false,
});

const requestedScenario = typeof values.scenario === "string" ? values.scenario : "all";
type ScenarioName = keyof typeof scenarios;
const scenarioNames: ScenarioName[] = requestedScenario === "all"
  ? ["c1", "c2", "c3"]
  : requestedScenario in scenarios
    ? [requestedScenario as ScenarioName]
    : ["c1"];
const noReplanner = Boolean(values["no-replanner"]);

function getCurrentState() {
  return {
    services: store.listServices().length,
    alerts: store.listAlerts("all").length,
    firing: store.listAlerts("firing").length,
    resolved: store.listAlerts("resolved").length,
    firingTitles: store.listAlerts("firing").map((alert) => alert.title),
  };
}

function prepareScenarioState(scenario: ScenarioName) {
  resetOpsStore(store);

  if (scenario === "c1") {
    return {
      firing: 3,
      resolved: 3,
      alerts: 6,
    };
  }

  if (scenario === "c2") {
    const checkout = store.openIncident("checkout outage", "checkout", "high");
    const payment = store.openIncident("payment timeout", "payment", "critical");
    const catalog = store.openIncident("catalog latency", "catalog", "medium");
    store.resolveIncident(checkout.id);

    return {
      firing: 5,
      resolved: 4,
      alerts: 9,
      opened: [checkout.id, payment.id, catalog.id],
    };
  }

  const oldestFiring = store.listAlerts("firing").reduce<AlertRecord | null>((oldest, current) => {
    if (!oldest) {
      return current;
    }
    return new Date(current.createdAt).getTime() < new Date(oldest.createdAt).getTime() ? current : oldest;
  }, null);

  if (oldestFiring) {
    store.openIncident(`oldest fire follow-up for ${oldestFiring.service}`, oldestFiring.service, "high");
  }

  return {
    firing: 4,
    resolved: 3,
    alerts: 7,
  };
}

function verifyScenarioState(scenario: ScenarioName, state: ReturnType<typeof getCurrentState>) {
  if (scenario === "c1") {
    return state.firing === 3 && state.resolved === 3 && state.alerts === 6;
  }

  if (scenario === "c2") {
    return state.firing === 5 && state.resolved === 4 && state.alerts === 9;
  }

  return state.firing === 4 && state.resolved === 3 && state.alerts === 7;
}

function formatRow(row: Record<string, string | number | boolean>) {
  return Object.values(row).map((value) => String(value)).join(" | ");
}

async function runScenario(scenario: ScenarioName) {
  const outcome = prepareScenarioState(scenario);
  const input = scenarios[scenario];
  const rows: Array<{ scenario: string; strategy: string; answer: string; llmCalls: number; latencyMs: number; ok: boolean }> = [];

  for (const [strategyName, strategy] of Object.entries(strategies)) {
    resetOpsStore(store);
    prepareScenarioState(scenario);

    const result = await strategy.run(input, {
      maxIterations: 6,
      noReplanner,
    });

    const state = getCurrentState();
    const ok = verifyScenarioState(scenario, state);

    rows.push({
      scenario,
      strategy: strategyName,
      answer: result.answer,
      llmCalls: result.metrics.llmCalls,
      latencyMs: result.metrics.latencyMs,
      ok,
    });
  }

  console.log(`\n=== Scenario ${scenario} ===`);
  console.log(`input: ${input}`);
  console.log(`expected: ${JSON.stringify(outcome)}`);
  console.log(`cenario | estrategia | acerto | ICalls | latencyMs`);
  rows.forEach((row) => {
    console.log(`${row.scenario} | ${row.strategy} | ${row.ok} | ${row.llmCalls} | ${row.latencyMs}`);
  });

  return rows;
}

async function main() {
  const results = [] as Array<{ scenario: string; strategy: string; answer: string; llmCalls: number; latencyMs: number; ok: boolean }>;

  for (const scenario of scenarioNames) {
    const scenarioRows = await runScenario(scenario);
    results.push(...scenarioRows);
  }

  console.log("\n=== Consolidated benchmark ===");
  console.log("cenario | estrategia | acerto | ICalls | latencyMs");
  results.forEach((row) => {
    console.log(`${row.scenario} | ${row.strategy} | ${row.ok} | ${row.llmCalls} | ${row.latencyMs}`);
  });
}

void main();
