# Implementation Plan: OpsPilot reasoning core

**Branch**: `001-ops-pilot-reasoning-core` | **Date**: 2026-10-22 | **Spec**: `specs/001-ops-pilot-reasoning-core/spec.md`

**Input**: Feature specification from `/specs/001-ops-pilot-reasoning-core/spec.md`

## Summary

Extend the OpsPilot reasoning core with a new external-provider status tool that lets the agent check public StatusPage endpoints for GitHub and Cloudflare without requiring credentials. The tool will be injected as part of the shared agent tool layer, validate the response with Zod, apply a 5-second timeout with a single retry on network/5xx failures, and return a compact one-line result so it stays within the reasoning context budget. The feature is intentionally isolated from the core store and remains fully testable with fake fetch implementations and no real network access.

## Technical Context

**Language/Version**: Node.js 22 LTS + TypeScript ESM strict

**Primary Dependencies**: Express, Zod, LangChain/LangGraph, @langchain/openai, node:sqlite

**Storage**: SQLite local persistence via `DatabaseSync` with `:memory:` for isolated tests; the provider status tool is stateless and does not require DB access

**Testing**: node:test via tsx in the project root; fetch is injected to unit tests to avoid external network calls

**Target Platform**: Local development, CLI validation, HTTP API execution

**Project Type**: Web-service + CLI + reasoning library

**Performance Goals**: low-latency public status checks, resilient external API calls, compact tool output under 1 line, bounded reasoning loops

**Constraints**: no secrets in repo, provider status checks must be safe when the upstream API is unavailable, tool errors must be returned as observation strings instead of thrown exceptions, no real network in tests

**Scale/Scope**: single-agent incident workflow extended with provider-health checks for GitHub and Cloudflare public StatusPage endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature remains compliant with the project constitution:
- boundary validation remains in Zod and tool schema definitions
- the tool itself stays in the agent/tooling layer and does not mix domain logic with I/O concerns
- failure handling is resilient and safe: tool errors are converted into readable observation strings rather than thrown exceptions
- tests are required and remain deterministic because fetch is injected and network access is avoided
- the architecture stays explicit and simple: stateless tool + injected fetch function + compact operational result
- SQLite persistence remains the canonical project storage model, while this feature is independent from the store and does not introduce a second DB abstraction

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
│   ├── index.ts
│   ├── models.ts
│   ├── plan-and-execute.ts
│   ├── react.ts
│   ├── reflection.ts
│   ├── seed-data.json
│   ├── seed.ts
│   ├── store.ts
│   ├── tools.ts
│   ├── tools-provider-status.test.ts
│   ├── trace.ts
│   └── types.ts
├── http/
│   ├── server.ts
│   └── server.test.ts
├── store/
│   ├── ops-store.ts
│   └── sqlite-ops-store.ts
├── arena.ts
├── bench.ts
├── placeholder.d.ts
└── index.ts (future entry point)
```

**Structure Decision**: Keep the new provider status functionality inside the shared agent tool layer with a pure helper (`checkProviderStatusWithFetch`) and a tool wrapper (`check_provider_status`). This preserves the current project structure while making the external API call isolated, injectable, and easy to test without real network access.

## Complexity Tracking

No constitution violations identified. The provider health check is kept narrow and composable without unnecessary abstraction or cross-cutting side effects.
