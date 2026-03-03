import { describe, it, expect } from 'vitest';
import { validateFindings } from '../findings-validator.js';

describe('validateFindings', () => {
  it('returns no warnings for well-formed findings', () => {
    const findings = `# P1: Dead Code Detection
### P1.1: Unused export
**Impact:** Data Loss | **Effort:** Quick Fix | **Confidence:** Confirmed

Some details here about the finding.

## Remediation Table
| ID | Finding | Impact | Effort | Confidence | Cross-Refs |
|---|---|---|---|---|---|
| P1.1 | Unused export | Data Loss | Quick Fix | Confirmed | — |`;

    const warnings = validateFindings('P1', findings);
    expect(warnings).toEqual([]);
  });

  it('warns when remediation table is missing', () => {
    const findings = `# P1: Dead Code Detection
### P1.1: Unused export
**Impact:** Data Loss | **Effort:** Quick Fix | **Confidence:** Confirmed
**Location:** \`src/utils.ts:42\` — \`unusedHelper()\`
This function is exported but never imported anywhere in the codebase. It can be safely removed.`;

    const warnings = validateFindings('P1', findings);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('MISSING_REMEDIATION_TABLE');
  });

  it('warns when no finding IDs are present', () => {
    const findings = `# P2: Testing Coverage
No structured findings here, just a narrative about the testing coverage of this project.
The test suite covers most of the core functionality but has some gaps in edge cases.

## Remediation Table
| ID | Finding | Impact | Effort | Confidence | Cross-Refs |
|---|---|---|---|---|---|`;

    const warnings = validateFindings('P2', findings);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('NO_FINDING_IDS');
  });

  it('warns when findings are too short', () => {
    const findings = 'Brief.';
    const warnings = validateFindings('P3', findings);
    const codes = warnings.map(w => w.code);
    expect(codes).toContain('FINDINGS_TOO_SHORT');
  });

  it('does not warn about short findings that say "no findings"', () => {
    const findings = 'No findings for this phase.';
    const warnings = validateFindings('P7', findings);
    const codes = warnings.map(w => w.code);
    expect(codes).not.toContain('FINDINGS_TOO_SHORT');
  });

  it('can return multiple warnings', () => {
    const findings = 'Short';
    const warnings = validateFindings('P5', findings);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });
});
