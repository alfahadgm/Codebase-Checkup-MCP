<div align="center">

# Codebase Checkup MCP

**Autonomous 10-phase codebase auditor for any MCP client.**

One command. Ten phases. Prioritized fixes. Verified by tests.

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/alfahadgm/Codebase-Checkup-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/alfahadgm/Codebase-Checkup-MCP/actions/workflows/ci.yml)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-compatible-8A2BE2.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org/)

</div>

---

## What Is This?

Codebase Checkup is a **prompt-based [Model Context Protocol](https://modelcontextprotocol.io) server** that provides structured audit prompts and manages session state. The LLM client (Claude Code, Claude Desktop, Cursor, or any MCP-compatible client) does the actual code analysis using its own file-reading tools. **The server never reads your codebase directly.**

```
You: "start checkup"
      |
      v
  [Plan] --> [Audit 10 phases] --> [Fix critical issues] --> [Verify tests pass]
      |              |                      |                        |
      v              v                      v                        v
  Scan project   P1: Dead Code        Apply critical          Run test suite
  structure      P2: Testing           & high-priority         Report results
  Identify       P3: Logic Gaps        fixes in batches
  tech stack     P4: API Contracts     Record outcomes
                 P5: Architecture
                 P6: Error Handling
                 P7: UX & Usability
                 P8: Missing UX
                 P9: Performance
                 P10: Synthesis
```

---

## Table of Contents

- [What Is This?](#what-is-this)
- [Quick Start](#quick-start)
- [Installation](#installation)
  - [Claude Code](#claude-code)
  - [Claude Desktop](#claude-desktop)
  - [Cursor](#cursor)
- [Usage Modes](#usage-modes)
- [The 10 Audit Phases](#the-10-audit-phases)
- [How Fixes Work](#how-fixes-work)
- [MCP Tools](#mcp-tools)
- [MCP Prompts and Resources](#mcp-prompts-and-resources)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

---

## Quick Start

### 1. Install and Build

```bash
git clone https://github.com/alfahadgm/Codebase-Checkup-MCP.git
cd Codebase-Checkup-MCP
npm install
npm run build
```

### 2. Add to Your MCP Client

```bash
# Claude Code (from your PROJECT directory — the codebase you want to audit):
claude mcp add --transport stdio checkup -- node /absolute/path/to/Codebase-Checkup-MCP/dist/index.js
```

> See [Installation](#installation) below for Claude Desktop, Cursor, and npx instructions.

### 3. Run

Open your MCP client in the project you want to audit and type:

```
start checkup
```

The agent will autonomously scan your project, run all 10 audit phases, apply critical fixes, and verify with your test suite.

---

## Installation

### Claude Code

```bash
# From source — run this inside the project you want to audit:
claude mcp add --transport stdio checkup -- node /absolute/path/to/Codebase-Checkup-MCP/dist/index.js

# After npm publish — no clone needed:
claude mcp add --transport stdio checkup -- npx -y checkup-mcp
```

Verify the connection:

```bash
claude mcp list
# Should show: checkup ...
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "checkup": {
      "command": "node",
      "args": ["/absolute/path/to/Codebase-Checkup-MCP/dist/index.js"]
    }
  }
}
```

After npm publish, use npx instead:

```json
{
  "mcpServers": {
    "checkup": {
      "command": "npx",
      "args": ["-y", "checkup-mcp"]
    }
  }
}
```

Restart Claude Desktop after editing the config.

### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "checkup": {
      "command": "node",
      "args": ["/absolute/path/to/Codebase-Checkup-MCP/dist/index.js"]
    }
  }
}
```

After npm publish:

```json
{
  "mcpServers": {
    "checkup": {
      "command": "npx",
      "args": ["-y", "checkup-mcp"]
    }
  }
}
```

---

## Usage Modes

### Autonomous Mode (recommended)

Type this in your MCP client:

```
start checkup
```

The agent handles everything end-to-end: Plan, Audit (10 phases), Fix (prioritized), Verify (tests + lint). You get a final summary of everything found and fixed.

**For zero interruptions** with Claude Code:

```bash
claude --dangerously-skip-permissions
```

Then type `start checkup`. No approval prompts will appear.

### Audit Only (no fixes)

If you want the audit report without auto-fixing:

```
run a full checkup audit
```

The agent runs all 10 phases and delivers a report with prioritized findings. You decide what to fix.

### Single Phase

Check just one area:

```
run checkup phase P3 (logic gaps)
```

### Resume an Interrupted Audit

If your session was interrupted (context limit, network issue, etc.):

```
resume my checkup audit
```

The agent calls `checkup_list_sessions` to find your session and picks up where it left off. All progress is saved server-side (sessions last 2 hours).

If you have the session ID:

```
resume checkup session <session-id>
```

---

## The 10 Audit Phases

| Phase | Name | What It Finds | Dependency |
|:-----:|------|---------------|------------|
| **P1** | Dead Code Detection | Unused exports, orphaned files, dead branches, unreachable code | Runs first -- dead code excluded from all later phases |
| **P2** | Testing Coverage | Coverage gaps, missing test types, weak assertions | Calibrates severity for P3-P9 |
| **P3** | Logic Gaps & Business Logic | Missing validation, race conditions, edge cases, business logic errors | Sequential |
| **P4** | API Integration & Contracts | Request/response mismatches, missing error handling, auth issues | Sequential |
| **P5** | System Architecture | Circular deps, poor separation, scalability problems, tech debt | Sequential |
| **P6** | Error Handling & Fault Tolerance | Swallowed errors, missing try/catch, no graceful degradation | Independent |
| **P7** | UX & Usability | Missing loading states, bad error messages, accessibility gaps | Independent |
| **P8** | Missing UX Capabilities | Backend features with no UI, UI calling nonexistent endpoints | Independent |
| **P9** | Performance Bottlenecks | N+1 queries, memory leaks, unbounded loops, large bundles | Independent |
| **P10** | Synthesis & Roadmap | Prioritized remediation roadmap combining all findings | Runs last -- aggregates everything |

P1 findings are excluded from later phases. P2 calibrates severity for P3-P9. P6-P9 are independent of each other and can be reordered.

---

## How Fixes Work

After the audit completes, the agent enters the fix phase:

1. **Extract** -- Generate a prioritized fix plan from all findings
2. **Apply** -- Critical + Quick Fix issues first (highest ROI), then high-priority
3. **Test** -- Run tests after each batch to catch regressions early
4. **Record** -- Log each fix outcome (completed / skipped / failed)

**What gets auto-fixed:**
- Critical + Quick Fix issues (highest ROI)
- High-priority issues with clear solutions
- Confirmed findings with specific file/line references

**What gets skipped (reported for manual review):**
- Architecture refactors (too risky for auto-fix)
- Public API changes (could break consumers)
- Suspected issues (not yet confirmed)
- Anything that would modify test files to make tests pass

---

## MCP Tools

| Tool | Purpose | When Called |
|------|---------|------------|
| `checkup_start_audit` | Create session, return first phase prompt | Start of audit |
| `checkup_next_phase` | Store findings, return next phase prompt | After completing each phase |
| `checkup_skip_phase` | Skip non-applicable phase, advance | Phase not relevant to project |
| `checkup_get_report` | Aggregate findings into final report | After all phases complete |
| `checkup_get_status` | Show current audit progress | Anytime |
| `checkup_list_sessions` | List all active sessions | For resuming interrupted audits |
| `checkup_get_fix_plan` | Extract prioritized fixes from findings | After audit completes |
| `checkup_record_fix` | Record fix outcome (completed/skipped/failed) | After each fix attempt |
| `checkup_get_progress` | Full audit + fix progress summary | Anytime |

---

## MCP Prompts and Resources

### Prompts

| Prompt | Description |
|--------|-------------|
| `checkup-p1` through `checkup-p10` | Individual phase audit prompts |
| `checkup-full-audit` | Run the full 10-phase audit (audit only, no fixes) |
| `checkup-autonomous` | Complete autonomous workflow: Plan, Audit, Fix, Verify |

### Resources

| URI | Description |
|-----|-------------|
| `checkup://methodology` | Complete audit methodology with severity scoring |
| `checkup://finding-format` | Expected output format for audit findings |
| `checkup://phase-overview` | Summary of all 10 phases with dependencies |

---

## Configuration

### Permission Settings

For fully autonomous operation with Claude Code, add to `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__checkup__checkup_start_audit",
      "mcp__checkup__checkup_next_phase",
      "mcp__checkup__checkup_skip_phase",
      "mcp__checkup__checkup_get_report",
      "mcp__checkup__checkup_get_status",
      "mcp__checkup__checkup_list_sessions",
      "mcp__checkup__checkup_get_fix_plan",
      "mcp__checkup__checkup_record_fix",
      "mcp__checkup__checkup_get_progress"
    ]
  }
}
```

This auto-approves the checkup MCP tools. You will still be prompted for file edits and bash commands (test runs) unless you use `--dangerously-skip-permissions`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHECKUP_LOG_LEVEL` | `warn` | Logging verbosity: `debug`, `info`, `warn`, `error` |

Logs are structured JSON written to stderr to avoid interfering with MCP's stdio transport.

---

## Troubleshooting

**"Session not found"**
Sessions expire after 2 hours of inactivity. Start a new audit with `start checkup`.

**Context limit reached mid-audit**
The agent will report the session ID before stopping. Start a new conversation and say:

```
resume checkup session <session-id>
```

All progress is saved server-side.

**No fixes generated**
The fix planner extracts actionable items from Remediation Tables in findings. If the audit produced no structured tables (unusual), there is nothing to extract. Re-run the audit.

**Tests fail after fixes**
The agent runs tests after each batch. If a fix breaks something, it will attempt to repair it. If it cannot, it records the fix as "failed" and moves on. Failed fixes are listed in the final report.

**MCP server not showing up**
- Verify the path in your config points to the built `dist/index.js` (not `src/index.ts`)
- Ensure you ran `npm run build` after cloning
- For Claude Desktop, restart the app after editing `claude_desktop_config.json`
- For Claude Code, run `claude mcp list` to verify the server is registered

---

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm start            # Run the MCP server (stdio transport)
npm run dev          # Watch mode (tsc --watch)
npm test             # Run all tests (vitest)
npm run test:watch   # Watch mode
npm run lint         # ESLint
npm run format       # Prettier (write)
npm run format:check # Prettier (check only)
```

CI runs on every push and PR: `lint` -> `format:check` -> `build` -> `test`

### Project Structure

```
src/
  index.ts              # Entry point -- StdioServerTransport
  server.ts             # McpServer setup -- registers tools/prompts/resources
  tools/                # One file per tool (Zod schema + handler)
  prompts/
    registry.ts         # Registers all MCP prompts
    templates/          # TypeScript template literal functions
  resources/
    registry.ts         # Registers MCP resources
  session/
    types.ts            # AuditSession, PhaseResult, FixItem, FixResult
    manager.ts          # In-memory session store (Map, 2hr TTL)
  lib/
    phase-config.ts     # ALL_PHASES array, phase filtering utilities
    prompt-builder.ts   # Composes phase prompt + cross-reference context
    cross-reference.ts  # Parses remediation tables, extracts summaries
    report-builder.ts   # Aggregates phase results into final report
    findings-validator.ts  # Non-blocking findings format validation
    fix-planner.ts      # Extracts prioritized fix plan from remediation tables
    logger.ts           # Structured JSON logger to stderr
```

---

## License

[MIT](LICENSE)

---

<div align="center">

Built with the [Model Context Protocol](https://modelcontextprotocol.io)

</div>
