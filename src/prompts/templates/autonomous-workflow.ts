import { ALL_PHASES } from '../../lib/phase-config.js';

/**
 * Master orchestration prompt for the autonomous workflow:
 * Plan → Audit → Fix → Verify
 */
export function autonomousWorkflowPrompt(): string {
  return `# Checkup Autonomous Workflow — Plan, Audit, Fix, Verify

You MUST run this entire workflow to completion without stopping to ask the user for confirmation between steps. This is a fully autonomous process.

**IMPORTANT — User Communication:**
Throughout this workflow, print brief status updates so the user can follow along. Use this format:

\`\`\`
--- [PHASE] Step description ---
\`\`\`

Examples:
- \`--- [PLAN] Scanning project structure ---\`
- \`--- [AUDIT] Starting P3: Logic Gaps & Business Logic (3/10) ---\`
- \`--- [FIX] Applying FIX-003: Missing null check in auth handler ---\`
- \`--- [VERIFY] Running test suite ---\`

Keep status updates to ONE line. Save detailed output for the final report.

---

## Phase 1: PLAN

Print: \`--- [PLAN] Scanning project structure ---\`

Quickly understand what you're auditing:

1. **Scan project structure** — list source directories, config files, build outputs
2. **Identify tech stack** — read package.json / Cargo.toml / go.mod / requirements.txt
3. **Find entry points** — main files, route handlers, exported modules
4. **Locate tests** — test directories, test framework, test run command
5. **Note conventions** — linting config, formatting config, CI/CD

Print a brief summary:
\`\`\`
--- [PLAN] Complete ---
Stack: [language/framework]
Entry: [main files]
Tests: [test command]
Files: [approximate count]
\`\`\`

Then immediately proceed to Phase 2.

---

## Phase 2: AUDIT

Print: \`--- [AUDIT] Starting 10-phase audit ---\`

1. Call \`checkup_start_audit\` (no parameters for a full audit)
2. For each phase:
   - Print: \`--- [AUDIT] Starting [PhaseID]: [Phase Name] ([N]/10) ---\`
   - Read the audit prompt carefully
   - **If not applicable** (e.g., UX phases on backend-only): Call \`checkup_skip_phase\` with a reason. Print: \`--- [AUDIT] Skipped [PhaseID]: [reason] ---\`
   - Otherwise: explore the codebase thoroughly, produce findings, call \`checkup_next_phase\`
   - Print: \`--- [AUDIT] Completed [PhaseID]: [N] findings ---\`
   - **DO NOT pause. DO NOT ask the user.**
3. When \`isComplete: true\`: Call \`checkup_get_report\`

Print:
\`\`\`
--- [AUDIT] Complete ---
Total findings: [N]
Critical: [N] | High: [N] | Medium: [N]
\`\`\`

### The 10 Phases
${ALL_PHASES.map((p) => `- **${p.id}:** ${p.name}`).join('\n')}

### Audit Quality Rules
- Be thorough: read actual source files, don't guess from filenames
- Every finding must cite specific file paths, function names, and line numbers
- Follow the finding format provided (including the Remediation Table)
- Cross-reference related findings across phases using IDs (e.g., "See P1.3")
- Keep each phase's findings to 500-2000 words — focus on Critical/High issues

---

## Phase 3: FIX

Print: \`--- [FIX] Generating fix plan ---\`

1. Call \`checkup_get_fix_plan\` to get the prioritized fix plan
2. Print:
   \`\`\`
   --- [FIX] Fix plan: [N] fixes in [N] batches ---
   Critical: [N] | High: [N] | Medium: [N]
   \`\`\`
3. **For each fix in order:**
   - Print: \`--- [FIX] Applying [FIX-ID]: [title] ---\`
   - Read the relevant source files
   - Apply the fix using your file-editing tools
   - Call \`checkup_record_fix\` with the result
   - If completed: Print \`--- [FIX] Applied [FIX-ID] ---\`
   - If skipped: Print \`--- [FIX] Skipped [FIX-ID]: [reason] ---\`
   - If failed: Print \`--- [FIX] Failed [FIX-ID]: [reason] ---\`
4. **After each batch completes:**
   - Print: \`--- [FIX] Batch [N] complete. Running tests ---\`
   - Run the project's test suite and linter
   - If tests fail: fix the issue and re-run
   - If tests pass: Print \`--- [FIX] Tests pass. Starting batch [N+1] ---\`
5. If running low on context, call \`checkup_get_progress\` for re-orientation

### Fix Execution Rules
- **Never skip a fix without explanation** — always record why
- **Prioritize safety**: skip rather than risk breaking production code
- **Run tests after every batch** — don't accumulate untested changes
- **Atomic changes**: keep each fix self-contained
- **Respect existing patterns**: match the codebase's style and conventions

### What NOT to Fix
- Fixes marked "Suspected" confidence — verify the issue first
- Architecture refactors — unless Critical priority
- Test file modifications to make tests pass — fix the source code instead
- Public API contract changes — skip and note for manual review

---

## Phase 4: VERIFY

Print: \`--- [VERIFY] Running final verification ---\`

1. Run the full test suite one final time
2. Run the linter
3. Call \`checkup_get_progress\` for the final summary

Then print the **final report** for the user:

\`\`\`
========================================
  CHECKUP COMPLETE
========================================

AUDIT RESULTS
  Phases completed: [N]/10
  Total findings:   [N]
  By severity:      [N] Critical | [N] High | [N] Medium

FIX RESULTS
  Fixes applied:    [N]
  Fixes skipped:    [N]
  Fixes failed:     [N]

VERIFICATION
  Tests:  [PASS/FAIL]
  Lint:   [PASS/FAIL]

SKIPPED FIXES (manual review recommended):
  - [FIX-ID]: [title] — [reason skipped]
  - [FIX-ID]: [title] — [reason skipped]

========================================
\`\`\`

---

## Context Management

This workflow is long. To manage context effectively:
- **After completing the audit** (Phase 2): summarize the top findings before starting fixes
- **Between fix batches**: call \`checkup_get_progress\` to re-orient if needed
- **If approaching context limit**: print the session ID and tell the user to resume in a new conversation:
  \`\`\`
  --- [PAUSED] Context limit approaching ---
  Session ID: [session-id]
  Progress: [N]/[N] phases, [N]/[N] fixes applied
  To resume: start a new conversation and say "resume checkup session [session-id]"
  \`\`\`

## Error Recovery

- If a tool call fails: call \`checkup_list_sessions\` to find existing sessions or start fresh
- If no test suite exists: skip verification but warn the user
- If context is full: report progress and session ID for manual continuation

---

**Start now.** Begin with Phase 1 (Plan): scan the project structure and identify the tech stack. Then immediately proceed to Phase 2 (Audit) by calling \`checkup_start_audit\`.
`;
}
