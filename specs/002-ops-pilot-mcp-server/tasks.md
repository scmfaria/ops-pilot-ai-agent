# Tasks: OpsPilot MCP server

**Input**: Design documents from `/specs/002-ops-pilot-mcp-server/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the project for a stdio MCP server that reuses the current tool definitions

- [ ] T001 Create the `src/mcp/` directory and keep the server entrypoint in `src/mcp/server.ts`
- [ ] T002 [P] Add the `mcp` script to `package.json` as `tsx src/mcp/server.ts` and keep it aligned with the Node ESM project setup
- [ ] T003 [P] Confirm the dependency set includes `@modelcontextprotocol/sdk` and validate the Node 22 stdio transport support

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the contract between the MCP server and the existing tool layer without duplication

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Identify the single source of truth for tool schemas and store logic, and reuse the existing `list_alerts`, `open_incident`, and `resolve_incident` definitions from `src/agents/tools.ts`
- [ ] T005 [P] Design a minimal MCP server wrapper that adapts the existing tool definitions to the `@modelcontextprotocol/sdk` protocol while preserving the same Zod validation
- [ ] T006 [P] Guarantee that diagnostics go to `stderr` and that `stdout` remains dedicated to MCP protocol traffic only
- [ ] T007 Ensure the server can initialize with the default `OpsStore` in memory and can be instantiated with an injected store for tests

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - MCP stdio server startup (Priority: P1) 🎯 MVP

**Goal**: Start a working stdio MCP server and register it under the name `opspilot`.

**Independent Test**: Start the server in-process and ensure it initializes without writing logs to stdout.

### Tests for User Story 1

- [ ] T008 [P] [US1] Test that the server starts successfully in stdio mode and reports its identity as `opspilot`
- [ ] T009 [P] [US1] Test that no console output is written to stdout during startup or normal idle state

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create the `src/mcp/server.ts` entrypoint implementation with the MCP stdio transport
- [ ] T011 [US1] Register the server name as `opspilot`
- [ ] T012 [US1] Keep startup diagnostics on `stderr` only and never emit `console.log` from the server code

**Checkpoint**: The MCP server is live and appears as `opspilot` over stdio

---

## Phase 4: User Story 2 - Tool exposure and store reuse (Priority: P2)

**Goal**: Expose the operational tools without duplicating schemas or store logic.

**Independent Test**: Invoke each tool through the MCP server and verify the same data and validation path used by the agent tooling layer.

### Tests for User Story 2

- [ ] T013 [P] [US2] Test that `list_alerts` is exposed via the MCP server and returns the existing store state
- [ ] T014 [P] [US2] Test that `open_incident` is exposed and records the new incident in the same store used by the app
- [ ] T015 [P] [US2] Test that `resolve_incident` is exposed and updates incident state using the same logic as the current tool layer

### Implementation for User Story 2

- [ ] T016 [P] [US2] Reuse the existing tool definitions from `src/agents/tools.ts` and avoid creating a second schema implementation
- [ ] T017 [US2] Adapt the tool metadata to MCP tool registration without changing the domain behavior or validation rules
- [ ] T018 [US2] Ensure the server uses the same `OpsStore` instance and therefore the same seed state and mutation semantics as the rest of the project

**Checkpoint**: MCP tool surface matches the existing operational functionality and shares the same source of truth

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and stability checks

- [ ] T019 [P] Add a focused MCP server test file under `src/mcp/` or `src/` to validate registration and tool access patterns
- [ ] T020 [P] Run `npm test -- --test-reporter=spec` and ensure the new server tests pass alongside the rest of the suite
- [ ] T021 [P] Run `npm run typecheck` and fix any type drift caused by the protocol wrapper or tool registration
- [ ] T022 Verify that the `mcp` script works in practice and does not emit diagnostic traffic on stdout

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependency on other stories
- **User Story 2 (P2)**: Can start after User Story 1 and can be tested independently once the server is initialized

### Within Each User Story

- Tests must be written first and fail before implementation
- Tool and validation reuse before server registration
- Server startup before protocol-level tool invocation
- Story completion before moving to the next priority

### Parallel Opportunities

- Setup tasks marked `[P]` can run in parallel
- Foundational tasks marked `[P]` can run in parallel
- User Story 1 tests can run in parallel after the server wrapper is sketched
- Final validation can run in parallel with doc cleanup once the server is green
