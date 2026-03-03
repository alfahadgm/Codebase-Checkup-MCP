import { ALL_PHASES } from '../../lib/phase-config.js';

/**
 * Master orchestration prompt for the autonomous audit workflow:
 * Plan → Audit → Handoff (session ID for fix phase in a new conversation)
 */
export function autonomousWorkflowPrompt(): string {
  return `# Checkup Autonomous Workflow — Plan, Audit, Handoff

You MUST run this entire workflow to completion without stopping to ask the user for confirmation between steps. This is a fully autonomous process.

**IMPORTANT — User Communication:**
Throughout this workflow, print brief status updates so the user can follow along. Use this format:

\`\`\`
--- [PHASE] Step description ---
\`\`\`

Examples:
- \`--- [PLAN] Scanning project structure ---\`
- \`--- [AUDIT] Starting P3: Logic Gaps & Business Logic (3/10) ---\`
- \`--- [AUDIT] Completed P3: 5 findings ---\`

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
- Prioritize Critical/High findings but include all that are relevant

---

## Phase 3: HANDOFF

After the audit is complete and you have called \`checkup_get_report\`, print the full report to the user. Then print the handoff message:

\`\`\`
========================================
  AUDIT COMPLETE
========================================

Phases completed: [N]/10
Total findings:   [N]
By severity:      [N] Critical | [N] High | [N] Medium

Session ID: [session-id]

To apply fixes, start a new conversation and use:
  checkup-fix(sessionId: "[session-id]")

The server stores all findings for 2 hours.
========================================
\`\`\`

**STOP HERE.** Do NOT proceed to apply fixes. The fix phase runs in a separate conversation with a clean context window. The user will start a new chat and use the \`checkup-fix\` prompt with the session ID above.

---

## Context Management

This workflow covers 10 audit phases. To manage context effectively:

### Between Phases
- **Be concise but thorough**: prioritize Critical/High findings. Include all that are relevant — do not artificially cap your findings count.
- **Do NOT repeat prior phase findings** in your analysis text — the server injects cross-references automatically.
- **After completing each phase**, move directly to the next. Do NOT summarize what you just found.

### Phase Group Checkpoints
After completing each group, print a brief checkpoint:
- **After P2** (Foundation complete): Print finding count and severity breakdown for P1-P2
- **After P5** (Core analysis complete): Print finding count for P3-P5 and top 3 cross-cutting themes
- **After P9** (All analysis complete): Call \`checkup_get_progress\` before starting P10

### If Context Runs Low
1. Call \`checkup_compact_context\` for a minimal summary of all prior work (~1-2KB)
2. If past P5 and running low, skip remaining independent phases (P6-P9) with brief reasons via \`checkup_skip_phase\`
3. Never skip P10 — it aggregates all findings
4. As last resort, print the session ID and tell the user to resume:
   \`\`\`
   --- [PAUSED] Context limit approaching ---
   Session ID: [session-id]
   Progress: [N]/10 phases complete
   To resume: start a new conversation and say "resume checkup session [session-id]"
   \`\`\`

## Error Recovery

- If a tool call fails: call \`checkup_list_sessions\` to find existing sessions or start fresh
- If context is full: report progress and session ID for manual continuation

---

**Start now.** Begin with Phase 1 (Plan): scan the project structure and identify the tech stack. Then immediately proceed to Phase 2 (Audit) by calling \`checkup_start_audit\`.
`;
}
