# Tasks: OpsPilot persistence real with SQLite

**Input**: Design documents from `/specs/001-ops-pilot-reasoning-core/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project preparation for SQLite-backed operational persistence

- [ ] T001 Create the SQLite persistence module directory and align file structure under `src/store/`
- [ ] T002 [P] Add local DB workspace support by creating `data/` and updating `.gitignore` to ignore `data/` and `*.db`
- [ ] T003 [P] Validate Node 22 + `node:sqlite` compatibility and confirm runtime requirements for `DatabaseSync`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core persistence layer that must exist before user story work begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement `SqliteOpsStore` in `src/store/sqlite-ops-store.ts` with schema creation via idempotent DDL
- [ ] T005 [P] Add the `services`, `alerts`, `incidents`, and `runbooks` tables with domain constraints and `CHECK` rules for `tier`, `severity`, `status`, and other closed enums
- [ ] T006 [P] Implement prepared statements for all read/write operations in the SQLite store without string concatenation
- [ ] T007 Create a seed strategy for the real SQLite store that is idempotent and mirrors the existing mock scenario: 5 services, 6 alerts, 3 firing, 3 resolved, plus runbook entries for payments/auth
- [ ] T008 Add environment configuration support for `OPSPILOT_DB` with default `./data/opspilot.db` and `:memory:` in tests
- [ ] T009 Define the `OpsStore` interface contract and ensure the SQLite implementation satisfies it

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - SQLite store and seed (Priority: P1) 🎯 MVP

**Goal**: Deliver a real, deterministic persistence layer that can store services, alerts, incidents and runbooks.

**Independent Test**: Create an in-memory SQLite store, seed it, and verify the default scenario and operations behave correctly without external services.

### Tests for User Story 1

- [ ] T010 [P] [US1] Integration test in `src/store/sqlite-ops-store.test.ts` for seed creation and `:memory:` initialization
- [ ] T011 [P] [US1] Integration test in `src/store/sqlite-ops-store.test.ts` for `listServices`, `listAlerts`, `openIncident`, and `resolveIncident`
- [ ] T012 [P] [US1] Integration test in `src/store/sqlite-ops-store.test.ts` for filtering by status and verifying deterministic seeded state

### Implementation for User Story 1

- [ ] T013 [P] [US1] Implement `SqliteOpsStore` constructor and schema bootstrap in `src/store/sqlite-ops-store.ts`
- [ ] T014 [US1] Implement `seedPrimaryData()` and `reset()` behavior in `src/store/sqlite-ops-store.ts` to keep the seed idempotent
- [ ] T015 [US1] Implement `listServices()`, `listAlerts(status)`, `openIncident()`, and `resolveIncident()` using prepared statements
- [ ] T016 [US1] Add `incidents` persistence with `resolved_at` and `summary` fields and enforce nullable semantics correctly
- [ ] T017 [US1] Validate all domain enums and status fields with explicit `CHECK` constraints and throw domain-safe errors when invalid values are passed

**Checkpoint**: SQLite store is fully functional and independently testable

---

## Phase 4: User Story 2 - Tooling and real ops workflow (Priority: P2)

**Goal**: Update the operational tool layer so agents can read/write real persisted state and new runbook operations become available.

**Independent Test**: Run the tool layer against a SQLite-backed store and assert the outputs and schemas for alert, incident, and runbook queries.

### Tests for User Story 2

- [ ] T018 [P] [US2] Integration test in `src/agents/tools.test.ts` for `list_alerts`, `open_incident`, `resolve_incident`, `list_incidents`, and `consultar_runbook`
- [ ] T019 [P] [US2] Validation test in `src/agents/tools.test.ts` for bad enum values and invalid request payloads using Zod

### Implementation for User Story 2

- [ ] T020 [P] [US2] Review and update tool descriptions in `src/agents/tools.ts` to follow the six operational rules and include explicit domain semantics
- [ ] T021 [US2] Introduce `list_incidents(status = "open", "resolved", "all")` in `src/agents/tools.ts` and export it through the shared tool registry
- [ ] T022 [US2] Introduce `consultar_runbook(service)` in `src/agents/tools.ts` for service-specific operational guidance and attach the tool schema
- [ ] T023 [US2] Refactor tool creation to accept a store instance so SQLite-backed storage can be composed while the in-memory mock remains available for benchmarks and tests
- [ ] T024 [US2] Ensure `resetOpsStore()` works with both the default mock store and the SQLite-backed store without cross-contamination between tests
- [ ] T025 [US2] Update the exported tool arrays and helper aliases in `src/agents/tools.ts` to include the new tool set consistently

**Checkpoint**: Tooling supports real persisted operations and remains compatible with the mock store in benchmarking/test scenarios

---

## Phase 5: User Story 3 - Benchmarks, mocks, and deterministic validation (Priority: P3)

**Goal**: Keep benchmark and arena behavior deterministic while allowing both real SQLite and mocked memory modes.

**Independent Test**: Run the local benchmark and arena using the mock in-memory store to confirm scenario reproducibility and no DB dependency in offline validation.

### Tests for User Story 3

- [ ] T026 [P] [US3] Update `src/bench.test.ts` or benchmark scenario validation to confirm the benchmark still works with the mock store and scenario replay
- [ ] T027 [P] [US3] Integration test in `src/http/server.test.ts` or equivalent to verify `POST /chat` still works with the injected store and deterministic fake strategy
- [ ] T028 [P] [US3] Validate `:memory:` testing path for all existing store and tool tests so they pass without a real file-based DB

### Implementation for User Story 3

- [ ] T029 [P] [US3] Ensure the mock in-memory store remains available for tests and bench scenarios while SQLite is the production default
- [ ] T030 [US3] Reuse the same domain contract so the benchmark and arena can be executed against either store implementation without API drift
- [ ] T031 [US3] Adjust `src/bench.ts` and any scenario setup code to reset state cleanly when using either the mock or SQLite-backed store
- [ ] T032 [US3] Confirm the final output table format remains `cenario | estrategia | acerto | ICalls | latencyMs`

**Checkpoint**: Benchmarks and arena remain reproducible while the project can run with real SQLite persistence

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation, and quality gates

- [ ] T033 [P] Update project documentation for SQLite-first persistence in `README.md` and the feature docs under `specs/001-ops-pilot-reasoning-core/`
- [ ] T034 [P] Review `src/agents/store.ts` and `src/agents/tools.ts` for domain alignment with the SQLite store API and remove stale mock-only assumptions
- [ ] T035 [P] Run `npm run typecheck` and fix any type drift caused by the new store and tool signatures
- [ ] T036 [P] Run `npm test -- --test-reporter=spec` and confirm all deterministic tests pass under `:memory:` and mock-in-memory flows
- [ ] T037 [P] Validate the local app bootstrap path via `npm run dev` and ensure SQLite default path creation is safe for local use

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational - depends on the store contract but is independently testable
- **User Story 3 (P3)**: Can start after Foundational - verifies benchmark/integration compatibility

### Within Each User Story

- Tests MUST be defined before implementation
- Store/seed logic before tools
- Tools before integration validation
- Final verification before moving to the next phase

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete User Story 1 (SQLite store + seed)
3. Stop and validate the in-memory SQLite scenario
4. Move to tools and integration only when the storage contract is green

### Incremental Delivery

1. Foundation → SQLite store contract and schema
2. Add tool layer → real Operational API
3. Add benchmark/integration compatibility → preserve mock scenarios for local validation
4. Final polish and documentation

---

## Parallel Opportunities

- Setup tasks marked `[P]` can run in parallel
- Foundational tasks marked `[P]` can run in parallel
- User Story 1 tests can run in parallel once the schema contract is in place
- User Story 2 tool tests can run independently once the store contract is green
- Benchmark/integration validation can proceed in parallel with doc cleanup once all stories pass

---

# Tasks: OpsPilot external provider status check

**Input**: Design documents from `/specs/001-ops-pilot-reasoning-core/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are explicitly requested for this feature and must be written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the project for the external provider status feature

- [ ] T001 Confirm the shared tool layer contract in `src/agents/tools.ts` and identify extension points for the new provider-check tool
- [ ] T002 [P] Review the existing `tool` and `zod` patterns to keep the new API consistent with the OpsPilot agent design
- [ ] T003 [P] Validate that the project can safely add a fetch-based helper without network access in tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core helper logic and validation that must exist before the tool can be exposed to agents

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement a pure helper `checkProviderStatusWithFetch()` in `src/agents/tools.ts` for provider status retrieval and response normalization
- [ ] T005 [P] Define a strict Zod schema for the provider status payload and keep the validation rule limited to the expected structure: `status.indicator` and `status.description`
- [ ] T006 [P] Add `AbortSignal.timeout(5000)` handling and a single retry path for network or 5xx failures without throwing exceptions out of the helper
- [ ] T007 Define the provider enum and URL mapping for `github` and `cloudflare` in `src/agents/tools.ts`
- [ ] T008 Ensure the helper returns a compact, readable one-line status string in the tool result and never leaks raw fetch exceptions

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - External provider status tool (Priority: P1) 🎯 MVP

**Goal**: Expose a provider status tool that can answer whether a dependency outage is likely caused by a third-party service.

**Independent Test**: Call the helper with a fake fetch implementation and verify that valid payloads, timeouts, and invalid schema responses are handled safely.

### Tests for User Story 1

- [ ] T009 [P] [US1] Add a unit test in `src/agents/tools-provider-status.test.ts` covering the happy path for a valid provider response
- [ ] T010 [P] [US1] Add a unit test in `src/agents/tools-provider-status.test.ts` covering timeout + retry behavior with a fake fetch implementation
- [ ] T011 [P] [US1] Add a unit test in `src/agents/tools-provider-status.test.ts` covering invalid payload handling without throwing

### Implementation for User Story 1

- [ ] T012 [P] [US1] Add the `check_provider_status` tool to the exported tool set in `src/agents/tools.ts`
- [ ] T013 [US1] Provide the schema with `provider` enum, default `github`, and a `.describe()` field explaining when to call it: external dependency suspicion, provider outage, or internal-vs-external triage
- [ ] T014 [US1] Make the tool result compact and one-line: `provider: indicator - description`
- [ ] T015 [US1] Ensure the tool never throws to the caller; invalid responses are swallowed and returned as a readable observation string
- [ ] T016 [US1] Keep the public StatusPage URLs internal to the helper and not in the domain model or route layer

**Checkpoint**: Tool is exposed and independently testable with deterministic fake fetch implementations

---

## Phase 4: User Story 2 - Agent integration and validation (Priority: P2)

**Goal**: Make the new tool available in the current reasoning flow without disturbing existing behavior.

**Independent Test**: Confirm the agent tool registry still exposes the original tools, and the new provider tool is available alongside them.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add or update a regression test to confirm the exported tool registry includes `check_provider_status`
- [ ] T018 [P] [US2] Add a validation check verifying existing tools (`list_alerts`, `open_incident`, etc.) still work after the new provider tool is added

### Implementation for User Story 2

- [ ] T019 [P] [US2] Export the new tool and helper in the same pattern as the other tools in `src/agents/tools.ts`
- [ ] T020 [US2] Ensure the tool composition remains minimal and does not multiply complexity in the runtime flow
- [ ] T021 [US2] Keep the tool output aligned with the project’s context budget: compact and operationally useful

**Checkpoint**: New tool integrates cleanly into the existing OpsPilot agent tool layer

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation

- [ ] T022 [P] Update the feature docs in `README.md` and relevant spec notes with the new external-provider status tool capability
- [ ] T023 [P] Run `npm test -- --test-reporter=spec` and confirm all deterministic tests remain green
- [ ] T024 [P] Run `npm run typecheck` and resolve any type drift caused by the new enum and helper signatures
- [ ] T025 Verify the tool stays resilient without real network access and that no thrown exceptions escape the tool boundary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on other stories
- **User Story 2 (P2)**: Can start after User Story 1 and confirm provider tool integration is stable

### Within Each User Story

- Tests must be written first and fail before implementation
- Validation logic before tool exposure
- Tool exposure before final integration checks
- Story completion before moving to next priority

### Parallel Opportunities

- Setup tasks marked `[P]` can run in parallel
- Foundational tasks marked `[P]` can run in parallel
- User Story 1 tests can run in parallel once the helper contract is defined
- Final docs and validation can run in parallel after the feature is green

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Implement helper + validation + retry logic
3. Add fake-fetch tests for success, timeout, and invalid payload
4. Expose the tool and verify the compact output is correct
5. Stop and validate before integrating into the wider flow

### Incremental Delivery

1. Foundation → helper and validation
2. Tool exposure → agent-level integration
3. Final polish → docs and validation

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Add a unit test covering the happy path for a valid provider response"
Task: "Add a unit test covering timeout + retry behavior with a fake fetch implementation"
Task: "Add a unit test covering invalid payload handling without throwing"
```
