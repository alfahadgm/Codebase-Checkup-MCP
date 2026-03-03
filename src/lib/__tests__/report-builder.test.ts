import { describe, it, expect } from 'vitest';
import { buildFinalReport } from '../report-builder.js';
import { PhaseResult } from '../../session/types.js';

const makeFinding = (phaseId: string, findings: string): PhaseResult => ({
  phaseId,
  findings,
  findingSummary: `Summary for ${phaseId}`,
  completedAt: new Date('2026-03-03'),
});

const SAMPLE_P1 = `# P1: Dead Code Detection

## Findings

### P1.1: Unused export
**Impact:** Revenue Loss | **Effort:** Quick Fix | **Confidence:** Confirmed
**Location:** \`src/utils.ts:10\`

Unused function.

### P1.2: Dead branch
**Impact:** Security Breach | **Effort:** Moderate (1-3 days) | **Confidence:** Suspected
**Location:** \`src/legacy.ts:20\`

Always-false condition.

## Remediation Table

| ID | Finding | Impact | Effort | Confidence | Cross-Refs |
|---|---|---|---|---|---|
| P1.1 | Unused export | Revenue Loss | Quick Fix | Confirmed | — |
| P1.2 | Dead branch | Security Breach | Moderate (1-3 days) | Suspected | — |
`;

const SAMPLE_P2 = `# P2: Testing Coverage

## Findings

### P2.1: No unit tests for auth
**Impact:** Data Loss | **Effort:** Significant Refactor | **Confidence:** Confirmed
**Location:** \`src/auth/\`

No test coverage.

## Remediation Table

| ID | Finding | Impact | Effort | Confidence | Cross-Refs |
|---|---|---|---|---|---|
| P2.1 | No unit tests for auth | Data Loss | Significant Refactor | Confirmed | P1.2 |
`;

describe('buildFinalReport - markdown', () => {
  const phases: PhaseResult[] = [makeFinding('P1', SAMPLE_P1), makeFinding('P2', SAMPLE_P2)];

  it('returns report, statistics, and roadmap', () => {
    const result = buildFinalReport(phases, 'markdown');
    expect(result.report).toContain('# Checkup Audit Report');
    expect(result.statistics).toBeDefined();
    expect(result.remediationRoadmap).toBeTruthy();
  });

  it('includes statistics', () => {
    const { statistics } = buildFinalReport(phases, 'markdown');
    expect(statistics.totalFindings).toBe(3); // P1.1, P1.2, P2.1
    expect(statistics.byPhase).toHaveLength(2);
    expect(statistics.byPhase[0].phaseId).toBe('P1');
    expect(statistics.byPhase[0].findingCount).toBe(2);
    expect(statistics.byPhase[1].findingCount).toBe(1);
  });

  it('counts severity correctly', () => {
    const { statistics } = buildFinalReport(phases, 'markdown');
    // P1: Revenue Loss (high) + Security Breach (critical)
    // P2: Data Loss (critical)
    expect(statistics.bySeverity.critical).toBeGreaterThanOrEqual(2);
    expect(statistics.bySeverity.high).toBeGreaterThanOrEqual(1);
  });

  it('includes phase reports in output', () => {
    const { report } = buildFinalReport(phases, 'markdown');
    expect(report).toContain('P1: Dead Code Detection');
    expect(report).toContain('P2: Testing Coverage');
  });
});

describe('buildFinalReport - json', () => {
  const phases: PhaseResult[] = [makeFinding('P1', SAMPLE_P1)];

  it('returns valid JSON', () => {
    const result = buildFinalReport(phases, 'json');
    const parsed = JSON.parse(result.report);
    expect(parsed.phases).toHaveLength(1);
    expect(parsed.statistics).toBeDefined();
  });

  it('includes statistics in JSON', () => {
    const result = buildFinalReport(phases, 'json');
    const parsed = JSON.parse(result.report);
    expect(parsed.statistics.totalFindings).toBe(2);
  });

  it('returns empty roadmap for json format', () => {
    const result = buildFinalReport(phases, 'json');
    expect(result.remediationRoadmap).toBe('');
  });
});

describe('buildFinalReport - edge cases', () => {
  it('handles empty findings gracefully', () => {
    const phases: PhaseResult[] = [makeFinding('P1', 'No findings for this phase.')];
    const result = buildFinalReport(phases, 'markdown');
    expect(result.statistics.totalFindings).toBe(0);
  });
});
