/**
 * Fix workflow prompt — runs in a NEW conversation after the audit.
 * Retrieves findings from the server via session ID, asks the user
 * which fixes to apply, then applies them in sequential batches.
 */
export function fixWorkflowPrompt(sessionId: string): string {
  return `# Checkup Fix Workflow — Apply Fixes from Audit

You are resuming a completed audit in a fresh conversation. The audit findings are stored server-side under session ID \`${sessionId}\`.

**This is an interactive workflow.** Ask the user for confirmation at key decision points.

**Status updates:** Print brief status lines so the user can follow along:
\`\`\`
--- [STEP] Description ---
\`\`\`

---

## Step 1: RECOVER

Print: \`--- [RECOVER] Loading audit findings for session ${sessionId} ---\`

1. Call \`checkup_get_report\` with sessionId \`${sessionId}\`
2. If the session is not found or expired, tell the user and stop
3. Print a **severity summary** for the user:
   \`\`\`
   --- [RECOVER] Audit findings loaded ---
   Total findings:   [N]
   Critical: [N] | High: [N] | Medium: [N]
   \`\`\`

---

## Step 2: ASK

Ask the user which fixes they want to apply. Present these options clearly:

1. **Critical only** — fix only critical-severity findings
2. **Critical + High** — fix critical and high-severity findings
3. **All fixes** — fix critical, high, and medium-severity findings
4. **Skip fixes** — the user only wanted the audit report, no fixes

Wait for the user's response before continuing. If the user chooses "Skip fixes", print a summary and stop.

---

## Step 3: PLAN

Print: \`--- [PLAN] Generating fix plan ---\`

1. Call \`checkup_get_fix_plan\` with:
   - sessionId: \`${sessionId}\`
   - priorityFilter: map the user's choice → \`"critical"\`, \`"critical_and_high"\`, or \`"all"\`
2. Print the fix plan summary:
   \`\`\`
   --- [PLAN] Fix plan ready ---
   Total fixes: [N] in [N] batches
   \`\`\`
3. Print each batch with its fixes (ID, title, priority, effort, file paths)
4. Ask the user: **"Ready to start applying fixes?"**

Wait for confirmation before proceeding.

---

## Step 4: FIX

For each batch in order:

1. Print: \`--- [FIX] Starting batch [N]/[total] ---\`
2. List the fixes in this batch
3. **For each fix:**
   - Print: \`--- [FIX] Applying [FIX-ID]: [title] ---\`
   - Read the relevant source files
   - Apply the fix using your file-editing tools
   - Call \`checkup_record_fix\` with the result (completed/skipped/failed)
   - Print the outcome: \`--- [FIX] Applied [FIX-ID] ---\` or \`--- [FIX] Skipped [FIX-ID]: [reason] ---\`
4. **After each batch completes:**
   - Print: \`--- [FIX] Batch [N] complete. Running tests ---\`
   - Run the project's test suite and linter
   - If tests fail: attempt to fix the issue and re-run
   - If tests pass: Print \`--- [FIX] Tests pass ---\`
   - Ask the user: **"Batch [N] complete. Continue to next batch?"**
5. If running low on context, call \`checkup_get_progress\` for re-orientation

### Fix Execution Rules
- **Never skip a fix without explanation** — always record why via \`checkup_record_fix\`
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

## Step 5: VERIFY

Print: \`--- [VERIFY] Running final verification ---\`

1. Run the full test suite one final time
2. Run the linter
3. Call \`checkup_get_progress\` with sessionId \`${sessionId}\`

Then print the **final report**:

\`\`\`
========================================
  FIXES COMPLETE
========================================

FIX RESULTS
  Fixes applied:    [N]
  Fixes skipped:    [N]
  Fixes failed:     [N]

VERIFICATION
  Tests:  [PASS/FAIL]
  Lint:   [PASS/FAIL]

SKIPPED FIXES (manual review recommended):
  - [FIX-ID]: [title] — [reason skipped]

========================================
\`\`\`

---

## Error Recovery

- If session not found: tell the user the session may have expired (2-hour TTL) and they need to re-run the audit
- If no test suite exists: skip test verification but warn the user
- If a fix breaks tests: rollback the fix, record as failed, and continue with the next fix

---

**Start now.** Call \`checkup_get_report\` with sessionId \`${sessionId}\` to load the audit findings.
`;
}
