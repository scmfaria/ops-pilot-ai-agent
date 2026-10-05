# Implementation Plan: OpsPilot reasoning core

**Branch**: `001-ops-pilot-reasoning-core` | **Date**: 2026-09-30 | **Spec**: `specs/001-ops-pilot-reasoning-core/spec.md`

**Input**: Feature specification from `/specs/001-ops-pilot-reasoning-core/spec.md`

## Summary

Build the reasoning core for OpsPilot as a deterministic, testable agent layer. The implementation adds a common `ReasoningStrategy` contract, a model factory for OpenRouter with `temperature: 0`, a mock in-memory operational store seeded with services and alerts, and two reasoning strategies (ReAct and Plan-and-Execute) that can run through a minimal CLI arena and emit structured traces and metrics.

## Technical Context

**Language/Version**: Node.js 22 LTS + TypeScript ESM strict

**Primary Dependencies**: Express, Sequelize/MySQL, Zod, LangChain/LangGraph, @langchain/openai

**Storage**: In-memory store for deterministic seed and tests; Sequelize-ready project structure for future production persistence

**Testing**: node:test via tsx in the project root

**Target Platform**: Local development and CLI arena execution

**Project Type**: CLI + service library structure

**Performance Goals**: deterministic execution, low latency for offline tests, bounded reasoning loop with max iterations

**Constraints**: `temperature: 0`, no network in unit tests, strict typing, no secrets in repo

**Scale/Scope**: single-agent reasoning core for OpsPilot incident operations with 5 services and 6 alerts seed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature is compliant with the project constitution:
- MVC separation is respected: model/store, service/tooling, and CLI arena remain distinct
- Validation on the boundary uses Zod for tool input and CLI arguments
- Domain logic stays free from I/O and external side effects
- Tests are required before feature delivery and remain deterministic without network
- Security rules are preserved by keeping secrets in `.env` and not committing keys
- The implementation is small and scoped to one feature area

## Project Structure

### Documentation (this feature)

```text
specs/001-ops-pilot-reasoning-core/
├── plan.md              # Implementation plan
├── research.md          # Research and decisions
├── data-model.md        # Entities and schema
├── quickstart.md        # Validation and run guide
├── contracts/
│   └── reasoning-strategy-contract.md
├── spec.md              # Feature specification
└── tasks.md             # Generated in later tasking phase
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── models.ts
│   ├── react.ts
│   ├── plan-and-execute.ts
│   ├── tools.ts
│   ├── store.ts
│   ├── trace.ts
│   ├── types.ts
│   ├── seed.ts
│   └── seed.test.ts
├── arena.ts
├── placeholder.d.ts
└── index.ts (future entry point)
```

**Structure Decision**: Single project with a feature-scoped `src/agents` module and `src/arena.ts` entry point. The code keeps domain logic, tool orchestration, model wiring, and tests in separate files while staying inside the existing Node/TypeScript project structure.

## Complexity Tracking

No constitution violations identified. No additional complexity exceptions required.
