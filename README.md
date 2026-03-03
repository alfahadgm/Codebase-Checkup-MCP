# Checkup MCP

Autonomous codebase auditor. One command. 10-phase gap analysis. Auto-fixes critical issues.

```
You: "start checkup"
      |
      v
  [Plan] --> [Audit 10 phases] --> [Fix critical issues] --> [Verify tests pass]
      |
      v
You: "Applied 12 fixes, skipped 3, all tests pass."
```

---

## Quick Start (2 minutes)

### Step 1: Install

```bash
# Clone and build
git clone <repo-url> checkup-mcp
cd checkup-mcp
npm install
npm run build
```

### Step 2: Add to Claude Code

```bash
# From your PROJECT directory (the codebase you want to audit):
claude mcp add checkup -- node /absolute/path/to/checkup-mcp/dist/index.js
```

Verify it's connected:
```bash
claude mcp list
# Should show: checkup (local) - node /path/to/checkup-mcp/dist/index.js
```

### Step 3: Run

Open Claude Code in your project and type:

```
start checkup
```

That's it. The agent will autonomously:
1. Scan your project structure
2. Run all 10 audit phases
3. Apply critical fixes
4. Run your tests to verify

---

## Usage Modes

### Autonomous Mode (recommended)

Just type this in Claude Code:

```
start checkup
```

The agent handles everything. You'll see it working through phases, applying fixes, and running tests. At the end you get a summary of what was found and fixed.

**For zero interruptions**, run Claude Code with:
```bash
claude --dangerously-skip-permissions
```
Then type `start checkup`. No approval prompts will appear.

### Audit Only (no fixes)

If you just want the audit report without auto-fixing:

```
run a full checkup audit
```

The agent runs all 10 phases and delivers a report with prioritized findings. You decide what to fix.

### Single Phase

Want to check just one area?

```
run checkup phase P3 (logic gaps)
```

### Resume an Interrupted Audit

If your session was interrupted (context limit, network, etc.):

```
resume my checkup audit
```

The agent calls `checkup_list_sessions` to find your session and picks up where it left off. All progress is saved server-side.

---

## What the 10 Phases Check

| Phase | What It Finds |
|-------|---------------|
| **P1: Dead Code** | Unused exports, orphaned files, dead branches, unreachable code |
| **P2: Testing** | Coverage gaps, missing test types, weak assertions |
| **P3: Logic Gaps** | Missing validation, race conditions, edge cases, business logic errors |
| **P4: API Contracts** | Request/response mismatches, missing error handling, auth issues |
| **P5: Architecture** | Circular deps, poor separation, scalability problems, tech debt |
| **P6: Error Handling** | Swallowed errors, missing try/catch, no graceful degradation |
| **P7: UX Issues** | Missing loading states, bad error messages, accessibility gaps |
| **P8: Missing UX** | Backend features with no UI, UI calling nonexistent endpoints |
| **P9: Performance** | N+1 queries, memory leaks, unbounded loops, large bundles |
| **P10: Synthesis** | Prioritized roadmap combining all findings |

Phases are sequential. P1 findings are excluded from later phases. P2 calibrates severity for P3-P9. P6-P9 are independent of each other.

---

## How Fixes Work

After the audit, the agent:

1. **Extracts** actionable fixes from all findings
2. **Prioritizes** by severity (Critical > High > Medium) then effort (Quick Fix first)
3. **Groups** into batches of related changes
4. **Applies** each fix, then records what was done
5. **Tests** after each batch to catch regressions early

### What gets auto-fixed
- Critical + Quick Fix issues (highest ROI)
- High-priority issues with clear solutions
- Confirmed findings with specific file/line references

### What gets skipped (reported for manual review)
- Architecture refactors (too risky for auto-fix)
- Public API changes (could break consumers)
- Suspected issues (not yet confirmed)
- Anything that would modify test files to pass

---

## Configuration

### Permission Settings

For fully autonomous operation, add to `~/.claude/settings.json`:

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

This auto-approves the checkup tools. You'll still be prompted for file edits and bash commands (test runs) unless you use `--dangerously-skip-permissions`.

### After npm publish

```bash
# No clone needed — install globally
claude mcp add checkup -- npx checkup-mcp
```

---

## Available Tools

| Tool | When It's Called | What It Does |
|------|-----------------|--------------|
| `checkup_start_audit` | Start of audit | Creates session, returns first phase prompt |
| `checkup_next_phase` | After each phase | Stores findings, returns next phase prompt |
| `checkup_skip_phase` | Phase not applicable | Skips with reason, advances to next |
| `checkup_get_report` | After all phases | Aggregates findings into final report |
| `checkup_get_status` | Anytime | Shows current progress |
| `checkup_list_sessions` | For resume | Lists active sessions |
| `checkup_get_fix_plan` | After audit | Extracts prioritized fixes from findings |
| `checkup_record_fix` | After each fix | Records fix result (completed/skipped/failed) |
| `checkup_get_progress` | Anytime | Full audit + fix progress summary |

---

## Troubleshooting

**"Session not found"**
Sessions expire after 2 hours. Start a new audit.

**Context limit reached mid-audit**
The agent will tell you the session ID. Start a new Claude Code conversation and say:
```
resume checkup session <session-id>
```

**No fixes generated**
The fix planner extracts from Remediation Tables in findings. If the audit produced no structured tables (unusual), there's nothing to extract. Re-run the audit.

**Tests fail after fixes**
The agent runs tests after each batch. If a fix breaks something, it will attempt to repair it. If it can't, it records the fix as "failed" and moves on.
