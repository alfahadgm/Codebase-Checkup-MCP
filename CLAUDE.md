# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

MCP server for comprehensive codebase audits. Provides a 10-phase gap analysis that any MCP client (Claude Desktop, Claude Code, Cursor) can use to audit codebases.

**Prompt-based MCP server** — the server provides structured audit prompts and manages session state. The LLM client does the actual code analysis using its own file-reading tools. The server never reads the user's codebase directly.

## Build & Run

```bash
npm install
npm run build        # tsc → dist/
npm start            # runs stdio transport
npm test             # vitest run (all tests)
npm run test:watch   # vitest in watch mode
npm run lint         # eslint src/
npm run format       # prettier --write src/
npm run format:check # prettier --check src/
npm run dev          # tsc --watch
```

CI runs: lint → format:check → build → test (see `.github/workflows/ci.yml`).

## Architecture

### Flow

1. Client calls `checkup_start_audit` → session created, first phase prompt returned
2. Client analyzes codebase following the prompt, produces findings
3. Client calls `checkup_next_phase` with findings → stored, next prompt returned with cross-reference context from prior phases
4. Repeat through all phases (use `checkup_skip_phase` for non-applicable phases)
5. Client calls `checkup_get_report` → aggregated report with adaptive remediation roadmap
6. Optionally: `checkup_get_fix_plan` → `checkup_record_fix` loop → `checkup_get_progress`

### Two-Conversation Workflow (Recommended)

The `checkup-autonomous` prompt runs audit only and outputs a session ID. Fixes run in a separate conversation with clean context:

1. **Conversation 1:** User runs `checkup-autonomous` → Plan + 10-phase audit → prints session ID + handoff instructions
2. **User opens a new chat** (clean context window)
3. **Conversation 2:** User runs `checkup-fix` prompt with the session ID → server returns stored findings → user picks severity filter → fixes applied in batches with user confirmation

### MCP Primitives

- **9 Tools:** `checkup_start_audit`, `checkup_next_phase`, `checkup_skip_phase`, `checkup_get_report`, `checkup_get_status`, `checkup_list_sessions`, `checkup_get_fix_plan`, `checkup_record_fix`, `checkup_get_progress`
- **13 Prompts:** `checkup-p1` through `checkup-p10` + `checkup-full-audit` + `checkup-autonomous` + `checkup-fix`
- **3 Resources:** `checkup://methodology`, `checkup://finding-format`, `checkup://phase-overview`

### Project Structure

```
src/
├── index.ts              # Entry point — creates server, connects StdioServerTransport
├── server.ts             # McpServer setup — registers all tools/prompts/resources
├── tools/                # One file per tool: exports {schema, handler}
├── prompts/
│   ├── registry.ts       # Registers all MCP prompts
│   └── templates/        # TS template literal functions (not markdown files)
├── resources/registry.ts # Registers MCP resources
├── session/
│   ├── types.ts          # AuditSession, PhaseResult, PhaseConfig, FixItem, FixResult
│   └── manager.ts        # In-memory session store (Map with 2hr TTL)
└── lib/
    ├── phase-config.ts   # ALL_PHASES array, filterPhases(), getPhasesInRange()
    ├── prompt-builder.ts # Composes phase prompt + cross-ref context
    ├── cross-reference.ts# Parses remediation tables, extracts summaries
    ├── report-builder.ts # Aggregates phase results into final report
    ├── findings-validator.ts # Non-blocking validation of findings format
    ├── fix-planner.ts    # Extracts prioritized fix plan from remediation tables
    └── logger.ts         # Structured JSON logger to stderr (env: CHECKUP_LOG_LEVEL)
```

Legacy files (`SKILL.md`, `audit.md`, `audit-specialist.md`, `run_audit.sh`) are the original markdown audit kit, kept for reference.

## Key Patterns

- **ES Modules** — `"type": "module"` in package.json. All imports use `.js` extensions (even for `.ts` source files). `module: "Node16"` + `moduleResolution: "Node16"` in tsconfig.
- **Tool handler convention** — each tool file exports a Zod schema and a handler function. `server.ts` registers them via `server.tool(name, description, schema.shape, handler)`.
- **Prompt templates** — TypeScript template literal functions, each returns a string given `{ priorFindings?: string }`. Not external markdown files.
- **Sessions** — in-memory `Map<string, AuditSession>`, no persistence. 2-hour TTL, cleaned lazily on access. `setFixPlan()` resets TTL for the fix phase.
- **Cross-referencing** — when a phase completes, `buildFindingSummary()` extracts a compact summary (remediation table or finding headers). Injected into all subsequent phase prompts.
- **Table parsing** — `parseRemediationTable()` extracts structured finding data (impact, effort, confidence) by column position.
- **Logging** — structured JSON to stderr via `logger.ts` (uses `console.error` to avoid interfering with MCP's stdio JSON-RPC transport). Control verbosity with `CHECKUP_LOG_LEVEL` env var (debug/info/warn/error, default: warn).
- **Tests** — colocated in `__tests__/` directories next to source files. Vitest with no special config beyond excluding `dist/` and `node_modules/`.
- **Session status lifecycle** — `in_progress` → `complete` → `fixing` → `fixes_complete`.

## The 10 Audit Phases

| ID | Name | Key Dependency |
|----|------|---------------|
| P1 | Dead Code Detection | Runs first — dead code excluded from all later phases |
| P2 | Testing Coverage | Calibrates severity for P3-P9 |
| P3 | Logic Gaps & Business Logic | |
| P4 | API Integration & Contracts | |
| P5 | System Architecture | |
| P6 | Error Handling & Fault Tolerance | Independent (P6-P9 order flexible) |
| P7 | UX & Usability | Independent |
| P8 | Missing UX Capabilities | Independent |
| P9 | Performance Bottlenecks | Independent |
| P10 | Synthesis & Roadmap | Runs last — aggregates all findings |

## Adding to MCP Clients

```bash
# Claude Code (local)
claude mcp add checkup -- node /path/to/checkup-mcp/dist/index.js

# After npm publish
claude mcp add checkup -- npx checkup-mcp
```
