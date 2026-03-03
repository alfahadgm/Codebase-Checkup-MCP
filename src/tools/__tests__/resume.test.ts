import { describe, it, expect } from 'vitest';
import { handleStartAudit } from '../start-audit.js';
import { handleNextPhase } from '../next-phase.js';

describe('session resume', () => {
  it('resumes an in-progress audit', () => {
    // Start audit
    const startResult = handleStartAudit({ phases: ['P1', 'P2', 'P3'] });
    const sessionId = JSON.parse(startResult.content[0].text).sessionId;

    // Complete P1
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: 'P1 findings' });

    // Resume — should return P2 as the current phase
    const resumeResult = handleStartAudit({ resumeSessionId: sessionId });
    const meta = JSON.parse(resumeResult.content[0].text);

    expect(meta.resumed).toBe(true);
    expect(meta.sessionId).toBe(sessionId);
    expect(meta.currentPhase.id).toBe('P2');
    expect(meta.progress.completed).toEqual(['P1']);
    expect(meta.progress.percent).toBeCloseTo(33.3, 0);
    expect(resumeResult.content[1].text).toContain('Resuming Audit');
  });

  it('reports completion when resuming a finished audit', () => {
    const startResult = handleStartAudit({ phases: ['P1'] });
    const sessionId = JSON.parse(startResult.content[0].text).sessionId;

    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: 'done' });

    const resumeResult = handleStartAudit({ resumeSessionId: sessionId });
    const meta = JSON.parse(resumeResult.content[0].text);

    expect(meta.isComplete).toBe(true);
    expect(meta.nextStep).toContain('checkup_get_report');
  });

  it('returns error for expired/invalid session', () => {
    const result = handleStartAudit({ resumeSessionId: 'nonexistent' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
