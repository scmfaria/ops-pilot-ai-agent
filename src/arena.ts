import { parseArgs } from "node:util";
import { reactStrategy } from "./agents/react.js";
import { planAndExecuteStrategy } from "./agents/plan-and-execute.js";
import { formatTrace } from "./agents/trace.js";

const { values } = parseArgs({
  options: {
    strategies: {
      type: "string",
      multiple: true,
      short: "s",
      default: ["react", "plan-and-execute"],
    },
    "max-iterations": {
      type: "string",
      short: "m",
      default: "6",
    },
    input: {
      type: "string",
      short: "i",
      default: "List all firing alerts and suggest the next operational action.",
    },
  },
  strict: false,
});

const strategies = {
  react: reactStrategy,
  "plan-and-execute": planAndExecuteStrategy,
} as const;

const rawStrategies = Array.isArray(values.strategies)
  ? values.strategies.filter((entry): entry is string => typeof entry === "string")
  : typeof values.strategies === "string"
  ? [values.strategies]
  : ["react", "plan-and-execute"];
const selected = rawStrategies.filter((entry): entry is keyof typeof strategies => entry in strategies);
const maxIterations = Number(values["max-iterations"] ?? 6);
const input = String(values.input ?? "List all firing alerts and suggest the next operational action.");

const run = async () => {
  for (const strategyName of selected) {
    const strategy = strategies[strategyName];
    const result = await strategy.run(input, { maxIterations });

    console.log(`\n=== Strategy: ${strategy.name} ===`);
    console.log(`answer: ${result.answer}`);
    console.log(`metrics: ${JSON.stringify(result.metrics)}`);
    console.log(`trace:\n${formatTrace(result.trace)}`);
  }
};

void run();
