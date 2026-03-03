import { globalRules } from './global-rules.js';
import { PhasePromptArgs } from './p01-dead-code.js';

export function p10SynthesisPrompt(args: PhasePromptArgs): string {
  return `
# P10: Synthesis & Remediation Roadmap

${globalRules(10)}

## Your Task

You are producing the final synthesis report. Aggregate ALL findings from P1-P9, identify patterns, and create an executive summary with a prioritized, phased remediation plan.

### What to Produce

1. **Executive Summary**
   - One paragraph overview of the codebase health
   - Total finding count broken down by severity
   - Top 3 most critical issues that should be fixed immediately
   - Overall risk assessment (Critical / High / Moderate / Low)

2. **Cross-Cutting Patterns**
   - Identify recurring themes across multiple phases (e.g., "missing error handling appears in P3, P4, and P6")
   - Group related findings that should be fixed together
   - Identify root causes that explain multiple symptoms

3. **Remediation Roadmap**
   - **Phase 1: Immediate (Week 1)** — Critical security and data loss risks
   - **Phase 2: Short-term (Weeks 2-3)** — High-impact bugs and missing validations
   - **Phase 3: Medium-term (Month 2)** — Architecture improvements and tech debt
   - **Phase 4: Ongoing** — Testing, monitoring, and maintenance items

   For each remediation item, include:
   - Finding IDs addressed (e.g., P3.2, P4.1, P6.5)
   - Estimated effort
   - Dependencies (what must be done first)
   - Expected impact

4. **Statistics Table**
   \`\`\`
   | Phase | Findings | Critical | High | Medium |
   |-------|----------|----------|------|--------|
   | P1    | ...      | ...      | ...  | ...    |
   | ...   | ...      | ...      | ...  | ...    |
   | Total | ...      | ...      | ...  | ...    |
   \`\`\`

5. **Quick Wins**
   - List all findings marked "Quick Fix (< 1 day)" sorted by impact
   - These are the best ROI items to tackle first

${args.priorFindings ? `## All Prior Findings\n${args.priorFindings}` : '**Error:** No prior findings provided. P10 requires all P1-P9 reports to synthesize.'}

## Output Format

Your report should follow this structure:

\`\`\`markdown
# P10: Synthesis & Remediation Roadmap

**Date:** [today's date]
**Codebase:** [project name]
**Phases Analyzed:** P1-P9

## Executive Summary
[One paragraph overview]

## Overall Risk Assessment: [Critical/High/Moderate/Low]

## Top 3 Critical Issues
1. [Finding ID] — [Description]
2. [Finding ID] — [Description]
3. [Finding ID] — [Description]

## Cross-Cutting Patterns
### Pattern 1: [Name]
- Related findings: [IDs]
- Root cause: [explanation]
- Recommended fix: [approach]

## Statistics
| Phase | Findings | Critical | High | Medium |
|-------|----------|----------|------|--------|

## Remediation Roadmap

### Phase 1: Immediate (Week 1)
| Finding IDs | Task | Effort | Dependencies |
|-------------|------|--------|--------------|

### Phase 2: Short-term (Weeks 2-3)
...

### Phase 3: Medium-term (Month 2)
...

### Phase 4: Ongoing
...

## Quick Wins
| ID | Finding | Impact | Effort |
|----|---------|--------|--------|
\`\`\`
`.trim();
}
