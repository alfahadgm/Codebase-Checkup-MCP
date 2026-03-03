import { describe, it, expect } from 'vitest';
import {
  extractCrossRefSummary,
  countFindings,
  extractSeverityCounts,
  parseRemediationTable,
  extractEffortCounts,
  compressSummaryToTableOnly,
  compressSummaryToOneLiner,
} from '../cross-reference.js';

const SAMPLE_FINDINGS = `# P1: Dead Code Detection

**Date:** 2026-03-03
**Codebase:** sample-app

## Assumptions
- Node.js project with TypeScript

## Findings

### P1.1: Unused helper function
**Impact:** Revenue Loss | **Effort:** Quick Fix | **Confidence:** Confirmed
**Location:** \`src/utils/helpers.ts:42\` — \`formatDate()\`

This function is exported but never imported anywhere.

---

### P1.2: Orphaned test file
**Impact:** Data Loss | **Effort:** Quick Fix | **Confidence:** Confirmed
**Location:** \`tests/old-auth.test.ts\`

Test file references deleted auth module.

---

### P1.3: Dead feature flag branch
**Impact:** Security Breach | **Effort:** Moderate (1-3 days) | **Confidence:** Suspected
**Location:** \`src/features/legacy.ts:15\` — \`checkLegacyMode()\`

Feature flag \`ENABLE_LEGACY\` is always false in all environments.

## Remediation Table

| ID | Finding | Impact | Effort | Confidence | Cross-Refs |
|---|---|---|---|---|---|
| P1.1 | Unused helper function | Revenue Loss | Quick Fix | Confirmed | — |
| P1.2 | Orphaned test file | Data Loss | Quick Fix | Confirmed | — |
| P1.3 | Dead feature flag branch | Security Breach | Moderate (1-3 days) | Suspected | — |
`;

const FINDINGS_NO_TABLE = `# P3: Logic Gaps

## Findings

### P3.1: Missing null check
**Impact:** Data Loss | **Effort:** Quick Fix | **Confidence:** Confirmed
**Location:** \`src/api/users.ts:55\`

No null check on user lookup.

### P3.2: Race condition in checkout
**Impact:** Revenue Loss | **Effort:** Significant Refactor | **Confidence:** Suspected
**Location:** \`src/checkout/process.ts:120\`

Concurrent requests could double-charge.
`;

const FINDINGS_NOTHING_USEFUL = `Some random text that doesn't follow the format at all.
No headers, no table, no structure.
Just a wall of text that the LLM produced incorrectly.
This should trigger the truncation fallback.`;

describe('extractCrossRefSummary', () => {
  it('extracts title and remediation table', () => {
    const summary = extractCrossRefSummary('P1', SAMPLE_FINDINGS);
    expect(summary).toContain('# P1: Dead Code Detection');
    expect(summary).toContain('## Remediation Table');
    expect(summary).toContain('P1.1');
    expect(summary).toContain('P1.3');
  });

  it('falls back to finding headers when no table', () => {
    const summary = extractCrossRefSummary('P3', FINDINGS_NO_TABLE);
    expect(summary).toContain('P3.1');
    expect(summary).toContain('P3.2');
    expect(summary).toContain('Findings from P3');
  });

  it('truncates as last resort', () => {
    const summary = extractCrossRefSummary('P5', FINDINGS_NOTHING_USEFUL);
    expect(summary).toContain('P5 Summary (truncated)');
    expect(summary).toContain('Some random text');
  });
});

describe('countFindings', () => {
  it('counts unique finding IDs', () => {
    expect(countFindings('P1', SAMPLE_FINDINGS)).toBe(3);
  });

  it('deduplicates IDs that appear in header and table', () => {
    // P1.1 appears in "### P1.1:" and in "| P1.1 |" — should still be 3
    expect(countFindings('P1', SAMPLE_FINDINGS)).toBe(3);
  });

  it('returns 0 for no findings', () => {
    expect(countFindings('P9', 'No findings for this phase.')).toBe(0);
  });

  it('only counts findings for the specified phase', () => {
    const mixed = SAMPLE_FINDINGS + '\n### P2.1: Some P2 finding\n| P2.1 | test |';
    expect(countFindings('P1', mixed)).toBe(3);
    expect(countFindings('P2', mixed)).toBe(1);
  });
});

describe('extractSeverityCounts', () => {
  it('categorizes severity from remediation table rows', () => {
    const counts = extractSeverityCounts(SAMPLE_FINDINGS);
    // P1.1: Revenue Loss → high, P1.2: Data Loss → critical, P1.3: Security Breach → critical
    expect(counts.critical).toBe(2); // data loss + security breach
    expect(counts.high).toBe(1); // revenue loss
    expect(counts.medium).toBe(0);
  });

  it('returns zeros for no table', () => {
    const counts = extractSeverityCounts(FINDINGS_NO_TABLE);
    expect(counts.critical).toBe(0);
    expect(counts.high).toBe(0);
    expect(counts.medium).toBe(0);
  });
});

describe('parseRemediationTable', () => {
  it('parses table rows into structured findings', () => {
    const parsed = parseRemediationTable(SAMPLE_FINDINGS);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({
      id: 'P1.1',
      finding: 'Unused helper function',
      impact: 'Revenue Loss',
      effort: 'Quick Fix',
      confidence: 'Confirmed',
      crossRefs: '—',
    });
  });

  it('returns empty array for findings without table', () => {
    expect(parseRemediationTable(FINDINGS_NO_TABLE)).toEqual([]);
    expect(parseRemediationTable(FINDINGS_NOTHING_USEFUL)).toEqual([]);
  });
});

describe('extractEffortCounts', () => {
  it('counts effort levels from table', () => {
    const counts = extractEffortCounts(SAMPLE_FINDINGS);
    expect(counts.quickFix).toBe(2); // P1.1 + P1.2
    expect(counts.moderate).toBe(1); // P1.3
    expect(counts.significantRefactor).toBe(0);
  });

  it('returns zeros for no table', () => {
    const counts = extractEffortCounts(FINDINGS_NO_TABLE);
    expect(counts.quickFix).toBe(0);
    expect(counts.moderate).toBe(0);
    expect(counts.significantRefactor).toBe(0);
  });
});

describe('extractCrossRefSummary - improved fallback', () => {
  it('includes impact metadata line when no table', () => {
    const summary = extractCrossRefSummary('P3', FINDINGS_NO_TABLE);
    // Should include the Impact/Effort/Confidence line alongside the header
    expect(summary).toContain('P3.1');
    expect(summary).toContain('**Impact:**');
  });
});

describe('compressSummaryToTableOnly', () => {
  it('extracts table data rows from a summary with remediation table', () => {
    const summary = extractCrossRefSummary('P1', SAMPLE_FINDINGS);
    const compressed = compressSummaryToTableOnly(summary);
    // Should contain data rows but NOT the title or column header
    expect(compressed).toContain('P1.1');
    expect(compressed).toContain('P1.2');
    expect(compressed).toContain('P1.3');
    expect(compressed).not.toContain('# P1: Dead Code Detection');
    expect(compressed).not.toContain('| ID');
    expect(compressed).not.toContain('---');
  });

  it('falls back to finding ID lines when no table rows', () => {
    const summary = extractCrossRefSummary('P3', FINDINGS_NO_TABLE);
    const compressed = compressSummaryToTableOnly(summary);
    expect(compressed).toContain('P3.1');
    expect(compressed).toContain('P3.2');
  });

  it('truncates as last resort for unstructured content', () => {
    const summary = extractCrossRefSummary('P5', FINDINGS_NOTHING_USEFUL);
    const compressed = compressSummaryToTableOnly(summary);
    // Should return something reasonable, truncated
    expect(compressed.length).toBeLessThanOrEqual(400);
  });
});

describe('compressSummaryToOneLiner', () => {
  it('produces a one-liner with finding count and severity', () => {
    const oneLiner = compressSummaryToOneLiner('P1', SAMPLE_FINDINGS);
    expect(oneLiner).toContain('**P1:**');
    expect(oneLiner).toContain('3 findings');
    expect(oneLiner).toContain('critical');
    expect(oneLiner).toContain('high');
  });

  it('handles findings with no remediation table', () => {
    const oneLiner = compressSummaryToOneLiner('P3', FINDINGS_NO_TABLE);
    expect(oneLiner).toContain('**P3:**');
    // countFindings finds P3.1 and P3.2 in the text
    expect(oneLiner).toContain('2 findings');
    // No remediation table → extractSeverityCounts returns zeros → no severity breakdown
    expect(oneLiner).not.toContain('critical');
  });

  it('handles zero findings', () => {
    const oneLiner = compressSummaryToOneLiner('P9', 'No findings for this phase.');
    expect(oneLiner).toBe('**P9:** 0 findings');
  });

  it('uses singular "finding" for exactly one', () => {
    const withTable = `## Remediation Table\n| ID | Finding | Impact | Effort | Confidence | Cross-Refs |\n|---|---|---|---|---|---|\n| P4.1 | Missing auth | Revenue Loss | Quick Fix | Confirmed | — |\n### P4.1: test`;
    const oneLiner = compressSummaryToOneLiner('P4', withTable);
    expect(oneLiner).toContain('1 finding');
    expect(oneLiner).not.toContain('1 findings');
  });
});
