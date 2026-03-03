/**
 * Standard finding output format template.
 * Ported from audit-specialist.md.
 */
export function findingFormat(phaseId: string, phaseTitle: string): string {
  return `
## Required Output Format

Your report MUST follow this structure:

\`\`\`markdown
# ${phaseId}: ${phaseTitle}

**Date:** [today's date]
**Codebase:** [project name from package.json, Cargo.toml, go.mod, or directory name]

## Assumptions
[What you inferred about the stack, environment, deployment]

## Findings

### ${phaseId}.1: [Finding Title]
**Impact:** [type] | **Effort:** [estimate] | **Confidence:** [Confirmed/Suspected]
**Location:** \`path/to/file.ts:42\` — \`functionName()\`
**Cross-refs:** [P1.3, P2.7 if applicable]

[Detailed description with code references. Include code snippets when helpful.]

---

[...more findings...]

## Remediation Table

| ID | Finding | Impact | Effort | Confidence | Cross-Refs |
|----|---------|--------|--------|------------|------------|
| ${phaseId}.1 | ... | ... | ... | ... | ... |
\`\`\`
`.trim();
}
