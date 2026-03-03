import { describe, it, expect } from 'vitest';
import { handleSkipPhase } from '../skip-phase.js';
import { handleStartAudit } from '../start-audit.js';

function startAndGetSessionId(phases?: string[]): string {
  const result = handleStartAudit(phases ? { phases } : {});
  return JSON.parse(result.content[0].text).sessionId;
}

describe('handleSkipPhase', () => {
  it('skips the current phase and advances', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2', 'P3']);
    const result = handleSkipPhase({
      sessionId,
      phaseId: 'P1',
      reason: 'Not applicable',
    });

    const meta = JSON.parse(result.content[0].text);
    expect(meta.isComplete).toBe(false);
    expect(meta.skipped).toBe('P1');
    expect(meta.reason).toBe('Not applicable');
    expect(meta.currentPhase.id).toBe('P2');
    expect(meta.progress.completed).toContain('P1');
  });

  it('completes audit when skipping last phase', () => {
    const sessionId = startAndGetSessionId(['P1']);
    const result = handleSkipPhase({
      sessionId,
      phaseId: 'P1',
      reason: 'Skip test',
    });

    const meta = JSON.parse(result.content[0].text);
    expect(meta.isComplete).toBe(true);
    expect(meta.nextStep).toContain('checkup_get_report');
  });

  it('returns error for invalid session', () => {
    const result = handleSkipPhase({
      sessionId: 'invalid',
      phaseId: 'P1',
      reason: 'test',
    });
    expect(result.isError).toBe(true);
  });

  it('returns error for wrong phase ID', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2']);
    const result = handleSkipPhase({
      sessionId,
      phaseId: 'P5', // not the current phase
      reason: 'test',
    });
    expect(result.isError).toBe(true);
  });
});
