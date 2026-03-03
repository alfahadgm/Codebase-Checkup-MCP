---
description: >
  Run a comprehensive system audit of the codebase. Executes 10 sequential analysis
  prompts covering dead code, testing, logic gaps, APIs, architecture, error handling,
  UX, missing features, performance, and synthesis. Each prompt produces a structured
  findings report in audit-reports/.
argument-hint: "[P3] [--start-from P5] [--parallel] [--auto]"
allowed-tools: Read, Bash, Grep, Glob, Write, Task
model: claude-sonnet-4-5-20250929
---

# System Audit Orchestrator

You are the orchestrator for a comprehensive codebase audit.

## Setup

1. Create `audit-reports/` directory if it doesn't exist: `mkdir -p audit-reports`
2. Read the skill definition: `.claude/skills/system-audit/SKILL.md`
3. Parse the argument to determine run mode:
   - No argument or `--auto`: Run all 10 prompts sequentially, auto-continuing
   - `P3` (single prompt ID): Run only that prompt
   - `--start-from P5`: Run P5 through P10
   - `--parallel`: Run P6-P9 in parallel (they're independent), rest sequential

## Prompt Files

Located at `.claude/skills/system-audit/prompts/`:
- P1_dead_code.md
- P2_testing.md
- P3_logic_gaps.md
- P4_api_integration.md
- P5_architecture.md
- P6_error_handling.md
- P7_ux_usability.md
- P8_missing_ux.md
- P9_performance.md
- P10_synthesis.md

## Execution Plan

For EACH prompt in the sequence:

1. **Read** the prompt file from `.claude/skills/system-audit/prompts/`
2. **Read** the global rules from `.claude/skills/system-audit/SKILL.md`
3. **List** existing reports in `audit-reports/` for cross-referencing context
4. **Delegate** to a subagent using the Task tool:
   - Give it the prompt content + global rules + list of prior report filenames
   - Tell it to read prior reports from `audit-reports/` before starting
   - Tell it to write its report to `audit-reports/P<N>_<slug>.md`
   - The subagent should explore the codebase thoroughly using Read, Bash, Grep, Glob
5. **Verify** the report file was created
6. **Summarize** the top 3 findings from the report
7. **Continue** to the next prompt (if `--auto`), otherwise ask user

If `--parallel` is specified:
- Run P1-P5 sequentially (they build on each other)
- Run P6, P7, P8, P9 as parallel background subagents
- Wait for all to complete
- Run P10 (synthesis) last

## Subagent Prompt Template

When spawning each subagent, use this structure:

```
You are an expert security and architecture auditor. You are analyzing the codebase
in the current working directory.

## Global Rules
[paste from SKILL.md]

## Prior Reports
Read these files for cross-referencing before you begin:
[list of audit-reports/*.md files]

## Your Task
[paste prompt content]

## Instructions
1. Explore the codebase structure first (tree, find, ls)
2. Investigate each area specified in the task
3. For every finding, cite specific files and line numbers
4. Write your complete report to: audit-reports/P<N>_<slug>.md
5. End by printing a 3-line summary of your top findings
```

## After All Prompts Complete

Print a summary:
```
✓ Audit complete. Reports in audit-reports/:
  P1_dead_code.md      — [count] findings
  P2_testing.md        — [count] findings
  ...
  P10_synthesis.md     — Executive summary + roadmap

Top 3 critical findings across all reports:
1. [most critical]
2. [second]
3. [third]
```

Now parse `$ARGUMENTS` and begin execution.
