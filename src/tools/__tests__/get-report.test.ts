import { describe, it, expect } from 'vitest';
import { handleGetReport } from '../get-report.js';
import { handleStartAudit } from '../start-audit.js';
import { handleNextPhase } from '../next-phase.js';

function startAndGetSessionId(phases?: string[]): string {
  const result = handleStartAudit(phases ? { phases } : {});
  return JSON.parse(result.content[0].text).sessionId;
}

const SAMPLE_FINDINGS = `# P1: Dead Code Detection
### P1.1: Unused export in utils.ts
**Impact:** Revenue Loss | **Effort:** Quick Fix | **Confidence:** Confirmed
**Location:** \`src/utils.ts:42\` — \`unusedHelper()\`

This function is exported but never imported.

## Remediation Table
| ID | Finding | Impact | Effort | Confidence | Cross-Refs |
|---|---|---|---|---|---|
| P1.1 | Unused export in utils.ts | Revenue Loss | Quick Fix | Confirmed | — |`;

describe('handleGetReport', () => {
  it('returns error for invalid session', () => {
    const result = handleGetReport({ sessionId: 'invalid', format: 'markdown' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('returns error when no phases completed', () => {
    const sessionId = startAndGetSessionId(['P1']);
    const result = handleGetReport({ sessionId, format: 'markdown' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No phases have been completed');
  });

  it('returns markdown report with statistics', () => {
    const sessionId = startAndGetSessionId(['P1']);
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: SAMPLE_FINDINGS });

    const result = handleGetReport({ sessionId, format: 'markdown' });
    expect(result.isError).toBeUndefined();
    expect(result.content.length).toBeGreaterThanOrEqual(2);

    const meta = JSON.parse(result.content[0].text);
    expect(meta.phasesCompleted).toBe(1);
    expect(meta.statistics).toBeDefined();
  });

  it('returns json report when format=json', () => {
    const sessionId = startAndGetSessionId(['P1']);
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: SAMPLE_FINDINGS });

    const result = handleGetReport({ sessionId, format: 'json' });
    expect(result.isError).toBeUndefined();

    const meta = JSON.parse(result.content[0].text);
    expect(meta.statistics).toBeDefined();
  });

  it('marks partial report for incomplete audit', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2']);
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: SAMPLE_FINDINGS });

    const result = handleGetReport({ sessionId, format: 'markdown' });
    const meta = JSON.parse(result.content[0].text);
    expect(meta.isPartialReport).toBe(true);
  });

  it('marks complete report for finished audit', () => {
    const sessionId = startAndGetSessionId(['P1']);
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: SAMPLE_FINDINGS });

    const result = handleGetReport({ sessionId, format: 'markdown' });
    const meta = JSON.parse(result.content[0].text);
    expect(meta.isPartialReport).toBe(false);
  });

  it('includes remediation roadmap for markdown format', () => {
    const sessionId = startAndGetSessionId(['P1']);
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: SAMPLE_FINDINGS });

    const result = handleGetReport({ sessionId, format: 'markdown' });
    // Should have at least 3 content blocks: meta, report, roadmap
    const allText = result.content.map(c => c.text).join('\n');
    expect(allText).toContain('Remediation');
  });
});
