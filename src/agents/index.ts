import { reactStrategy } from "./react.js";
import { planAndExecuteStrategy } from "./plan-and-execute.js";
import { withReflection } from "./reflection.js";
import type { ReasoningStrategy } from "./types.js";

export const strategyRegistry = {
  react: reactStrategy,
  "plan-and-execute": planAndExecuteStrategy,
} as const;

export type StrategyName = keyof typeof strategyRegistry;

export function resolveStrategy(name: string, reflect = false): ReasoningStrategy<string> {
  const strategy = strategyRegistry[name as StrategyName];

  if (!strategy) {
    throw new Error(`Unknown strategy: ${name}`);
  }

  return reflect ? withReflection(strategy, { maxReflections: 2 }) : strategy;
}
