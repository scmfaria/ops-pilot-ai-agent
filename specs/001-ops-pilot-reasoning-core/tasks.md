# Tasks: OpsPilot reasoning core

**Input**: Design documents from `/specs/001-ops-pilot-reasoning-core/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initial project structure and environment for the reasoning core

- [x] T001 Create the project feature directory and spec/plan scaffolding under `specs/001-ops-pilot-reasoning-core/`
- [x] T002 Configure the feature context in `.specify/feature.json`
- [x] T003 [P] Validate the project stack and dependency constraints against Node 22 + TypeScript strict

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core reasoning infrastructure that must exist before the strategy implementation

- [x] T004 Define the shared `ReasoningStrategy` contract and trace types in `src/agents/types.ts`
- [x] T005 [P] Implement the OpenRouter model factory with `temperature: 0` in `src/agents/models.ts`
- [x] T006 [P] Implement the in-memory store and primary seed in `src/agents/store.ts`
- [x] T007 [P] Implement LangChain tool wrappers for ops operations in `src/agents/tools.ts`
- [x] T008 Implement deterministic trace formatting in `src/agents/trace.ts`
- [x] T009 Configure the seed runner in `src/agents/seed.ts` and script entry in `package.json`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - ReAct strategy (Priority: P1) 🎯 MVP

**Goal**: Provide a working ReAct reasoning strategy using the prebuilt LangGraph agent and toolset.

**Independent Test**: Run the ReAct strategy against an incident input and verify emitted answer, trace, and metrics.

### Tests for User Story 1

- [x] T010 [P] [US1] Add deterministic store and trace tests in `src/agents/seed.test.ts`

### Implementation for User Story 1

- [x] T011 [P] [US1] Implement the ReAct strategy in `src/agents/react.ts`
- [x] T012 [US1] Ensure the ReAct strategy respects `maxIterations` and counts `llmCalls`
- [x] T013 [US1] Capture complete trace events including tool actions and final answer

**Checkpoint**: ReAct strategy is functional and testable independently

---

## Phase 4: User Story 2 - Plan-and-Execute strategy (Priority: P2)

**Goal**: Provide a plan-based reasoning strategy with planner, executor, and replanner loop.

**Independent Test**: Run the strategy with a production incident request and inspect the generated plan and critique sequence.

### Implementation for User Story 2

- [x] T014 [P] [US2] Implement the plan-and-execute strategy in `src/agents/plan-and-execute.ts`
- [x] T015 [US2] Enforce the maximum step budget and guard execution loop behavior
- [x] T016 [US2] Emit `plan`, `critique`, `observation`, and `answer` trace events

**Checkpoint**: Plan-and-Execute strategy is independently functional

---

## Phase 5: User Story 3 - Validation arena (Priority: P3)

**Goal**: Run multiple strategies over the same input and print structured results.

**Independent Test**: Execute `npm run arena -- --strategies react --strategies plan-and-execute --max-iterations 6` and verify output formatting.

### Implementation for User Story 3

- [x] T017 [P] [US3] Implement the arena CLI in `src/arena.ts`
- [x] T018 [US3] Add CLI argument parsing for `--strategies` and `--max-iterations`
- [x] T019 [US3] Print strategy answer, metrics, and formatted trace to stdout

**Checkpoint**: The comparison arena works across the implemented strategies

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and environment readiness

- [x] T020 [P] Run the Oops store seed script and verify seed contents via `npm run seed`
- [x] T021 [P] Run TypeScript validation via `npm run typecheck`
- [x] T022 [P] Run deterministic tests via `npm test -- --test-reporter=spec`
- [x] T023 Final review of code structure against MVC and constitution constraints
