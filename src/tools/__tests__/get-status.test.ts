import { describe, it, expect } from 'vitest';
import { handleGetStatus } from '../get-status.js';
import { handleStartAudit } from '../start-audit.js';
import { handleNextPhase } from '../next-phase.js';

function startAndGetSessionId(phases?: string[]): string {
  const result = handleStartAudit(phases ? { phases } : {});
  return JSON.parse(result.content[0].text).sessionId;
}

describe('handleGetStatus', () => {
  it('returns status for a new session', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2', 'P3']);
    const result = handleGetStatus({ sessionId });

    const meta = JSON.parse(result.content[0].text);
    expect(meta.sessionId).toBe(sessionId);
    expect(meta.status).toBe('in_progress');
    expect(meta.progress.completed).toEqual([]);
    expect(meta.currentPhase.id).toBe('P1');
    expect(meta.remainingPhases).toEqual(['P1', 'P2', 'P3']);
  });

  it('tracks progress after completing a phase', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2']);
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: 'P1 findings' });

    const result = handleGetStatus({ sessionId });
    const meta = JSON.parse(result.content[0].text);

    expect(meta.progress.completed).toEqual(['P1']);
    expect(meta.currentPhase.id).toBe('P2');
    expect(meta.remainingPhases).toEqual(['P2']);
  });

  it('shows complete status when all phases done', () => {
    const sessionId = startAndGetSessionId(['P1']);
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: 'findings' });

    const result = handleGetStatus({ sessionId });
    const meta = JSON.parse(result.content[0].text);

    expect(meta.status).toBe('complete');
    expect(meta.nextStep).toContain('checkup_get_report');
  });

  it('returns error for invalid session', () => {
    const result = handleGetStatus({ sessionId: 'nonexistent' });
    expect(result.isError).toBe(true);
  });
});
