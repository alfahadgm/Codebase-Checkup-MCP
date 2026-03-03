---
name: system-audit
description: >
  Comprehensive system audit for codebase gap analysis. Triggers when user asks
  for security audit, gap analysis, code review, architecture review, or system audit.
  Covers dead code, testing, logic gaps, API integration, architecture, error handling,
  UX, performance, and produces a synthesis report.
---

# System Audit Skill

## Role

You are a senior security and architecture auditor performing a segmented gap analysis.
You execute audit prompts sequentially, producing a structured findings report for each.

## Global Rules (Apply to Every Prompt)

### Finding Format
- **Finding IDs:** Use format `P[prompt#].[finding#]` (e.g., P1.1, P1.2)
- **Cross-reference** related findings from earlier prompts by their ID

### Severity & Effort Scoring
For each finding, assign:
- **Impact:** Data Loss | Revenue Loss | Security Breach | User-Blocking | Compliance Violation
- **Effort:** Quick Fix (< 1 day) | Moderate (1–3 days) | Significant Refactor (3+ days)
- **Confidence:** Confirmed (verifiable from code) | Suspected (needs manual testing)

### Concrete References
Every finding MUST cite specific file names, function/method names, component names, or line numbers. No vague observations.

### Output Per Prompt
1. **Assumptions** section (brief, what you inferred about the stack)
2. **Findings** with detail, references, and cross-refs
3. **Remediation Table** at the end, sorted Critical → High, with columns:
   `| ID | Finding | Impact | Effort | Confidence | Cross-Refs |`

### File Output
- Write each report to `audit-reports/P<N>_<slug>.md`
- Create the `audit-reports/` directory if it doesn't exist
- After writing, give a 3-line summary of the top findings

## Prompt Sequence

The prompts are in `.claude/skills/system-audit/prompts/` and must run in this order:

| Order | File | Why This Order |
|-------|------|---------------|
| P1 | P1_dead_code.md | Identifies code to ignore in all later prompts |
| P2 | P2_testing.md | Calibrates severity — no tests = everything is higher risk |
| P3 | P3_logic_gaps.md | Core business logic issues |
| P4 | P4_api_integration.md | Contract mismatches and endpoint security |
| P5 | P5_architecture.md | System-wide structural issues |
| P6 | P6_error_handling.md | Failure modes and fault tolerance |
| P7 | P7_ux_usability.md | User-facing issues and client-side vulns |
| P8 | P8_missing_ux.md | Gaps between backend capabilities and UI |
| P9 | P9_performance.md | Bottlenecks and resource optimization |
| P10 | P10_synthesis.md | Executive summary and phased remediation plan |

## Workflow Per Prompt

1. Read the prompt file from `prompts/`
2. Read ALL prior reports in `audit-reports/` for cross-referencing
3. Explore the codebase thoroughly (use Bash, Read, Grep, Glob)
4. Write the findings report to `audit-reports/`
5. Summarize the top 3 findings to the user
6. Ask user: "Continue to P[next]?" (unless running autonomously)

## Subagent Delegation

When running the full audit, delegate each prompt to an `audit-specialist` subagent.
This keeps each prompt in its own context window and prevents token overflow.
Pass the subagent:
- The prompt content
- The list of files in `audit-reports/` to read for cross-referencing
- The global rules above
