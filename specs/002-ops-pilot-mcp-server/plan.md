# Implementation Plan: OpsPilot MCP server

**Branch**: `002-ops-pilot-mcp-server` | **Date**: 2026-10-23 | **Spec**: `specs/002-ops-pilot-mcp-server/spec.md`

**Input**: Feature specification from `/specs/002-ops-pilot-mcp-server/spec.md`

## Summary

Add an MCP server that exposes the OpsPilot operational tools over stdio. The implementation will reuse the existing `OpsStore` and the current Zod schemas from the agents/tooling layer, avoiding duplicate validation and keeping a single source of truth. The server will be named `opspilot`, will run via a dedicated `mcp` script, and will respect the MCP transport contract by keeping `stdout` reserved for protocol traffic while sending diagnostics to `stderr`.

## Technical Context

**Language/Version**: Node.js 22 LTS + TypeScript ESM strict

**Primary Dependencies**: `@modelcontextprotocol/sdk`, Zod, Express-compatible runtime assumptions, Node stdio transport

**Storage**: Reuse the current `OpsStore` implementation; keep the same default in-memory store and optionally allow injection for tests

**Testing**: node:test via tsx; tests will verify tool registration and protocol startup without hitting real network services

**Target Platform**: local MCP client integration over stdio

**Project Type**: local MCP server

**Performance Goals**: no extra I/O, simple startup, low-latency tool dispatch

**Constraints**: no `console.log` in MCP server; no stdout pollution; only `stderr` for diagnostics; single source of truth for tool schemas and store behavior

**Scale/Scope**: single server exposing a small set of operational tools for incident status management

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature remains compliant with the project constitution:
- the new server sits at the integration boundary and does not mix domain logic with transport code
- tool behavior is centralized and reused from the existing store/tool layer
- validation remains done through Zod at the edge and is not duplicated in the server implementation
- tests remain deterministic and run in-process without network access
- no secrets or logs are emitted to stdout
- architecture remains simple and explicit with one source of truth for the operational contract

## Project Structure

### Documentation (this feature)

```text
specs/002-ops-pilot-mcp-server/
├── plan.md              # Implementation plan
├── research.md          # Research and decisions
├── data-model.md        # Entities and schema
├── quickstart.md        # Validation and run guide
├── spec.md              # Feature specification
└── tasks.md             # Generated in later tasking phase
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── tools.ts
│   └── ...
├── mcp/
│   └── server.ts
├── store/
│   ├── ops-store.ts
│   └── sqlite-ops-store.ts
├── http/
│   └── server.ts
└── ...
```

**Structure Decision**: Add a dedicated `src/mcp` module with a stdio server that wraps the existing `opsTools` or a shared tool definition registry. The server will not duplicate the store or schema logic; it will consume the same `OpsStore` and tool metadata already used elsewhere in the project.

## Complexity Tracking

No constitution violations identified. The server is intentionally narrow and leverages the existing tool definition system rather than creating an additional operational layer.
