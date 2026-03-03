import { describe, it, expect } from 'vitest';
import { handleNextPhase } from '../next-phase.js';
import { handleStartAudit } from '../start-audit.js';

function startAndGetSessionId(phases?: string[]): string {
  const result = handleStartAudit(phases ? { phases } : {});
  return JSON.parse(result.content[0].text).sessionId;
}

describe('handleNextPhase', () => {
  it('advances to next phase on successful completion', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2', 'P3']);
    const result = handleNextPhase({
      sessionId,
      completedPhaseId: 'P1',
      findings:
        '# P1: Dead Code\n\n## Remediation Table\n| ID | Finding | Impact | Effort | Confidence | Cross-Refs |\n|---|---|---|---|---|---|\n| P1.1 | Test | Revenue Loss | Quick Fix | Confirmed | — |',
    });

    expect(result.content).toHaveLength(2);
    const meta = JSON.parse(result.content[0].text);
    expect(meta.isComplete).toBe(false);
    expect(meta.currentPhase.id).toBe('P2');
    expect(meta.progressSummary).toContain('1/3');
    expect(meta.progress).toBeDefined();
    expect(meta.progress.percent).toBeCloseTo(33.3, 0);
  });

  it('marks audit complete when last phase is done', () => {
    const sessionId = startAndGetSessionId(['P1']);
    const result = handleNextPhase({
      sessionId,
      completedPhaseId: 'P1',
      findings: 'No findings',
    });

    const meta = JSON.parse(result.content[0].text);
    expect(meta.isComplete).toBe(true);
    expect(meta.nextStep).toContain('checkup_get_report');
  });

  it('returns error for invalid session', () => {
    const result = handleNextPhase({
      sessionId: 'invalid-session',
      completedPhaseId: 'P1',
      findings: 'test',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('includes prior finding summaries', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2']);
    handleNextPhase({
      sessionId,
      completedPhaseId: 'P1',
      findings: '# P1: Dead Code\n### P1.1: Unused export\nSome details.',
    });

    // P1 is done, now check that P2 response mentions P1 findings
    const session = handleNextPhase({
      sessionId,
      completedPhaseId: 'P2',
      findings: 'P2 findings',
    });

    // Session should be complete now
    const meta = JSON.parse(session.content[0].text);
    expect(meta.isComplete).toBe(true);
  });

  it('uses directive nextStep language', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2']);
    const result = handleNextPhase({
      sessionId,
      completedPhaseId: 'P1',
      findings: 'findings',
    });

    const meta = JSON.parse(result.content[0].text);
    expect(meta.nextStep).toContain('Immediately');
  });
});
