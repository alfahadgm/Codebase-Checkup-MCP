import { describe, it, expect } from 'vitest';
import { handleCompactContext } from '../compact-context.js';
import { handleStartAudit } from '../start-audit.js';
import { handleNextPhase } from '../next-phase.js';
import { handleSkipPhase } from '../skip-phase.js';

const SAMPLE_FINDINGS = `# P1: Dead Code Detection

## Findings

### P1.1: Unused helper function
**Impact:** Revenue Loss | **Effort:** Quick Fix | **Confidence:** Confirmed
**Location:** \`src/utils/helpers.ts:42\`

## Remediation Table

| ID | Finding | Impact | Effort | Confidence | Cross-Refs |
|---|---|---|---|---|---|
| P1.1 | Unused helper | Revenue Loss | Quick Fix | Confirmed | — |
| P1.2 | Dead export | Data Loss | Quick Fix | Confirmed | — |
`;

function startAndGetSessionId(phases?: string[]): string {
  const result = handleStartAudit(phases ? { phases } : {});
  return JSON.parse(result.content[0].text).sessionId;
}

describe('handleCompactContext', () => {
  it('returns error for invalid session', () => {
    const result = handleCompactContext({ sessionId: 'nonexistent' });
    expect(result.isError).toBe(true);
  });

  it('returns compact summary for session with completed phases', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2', 'P3']);
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: SAMPLE_FINDINGS });

    const result = handleCompactContext({ sessionId });
    const data = JSON.parse(result.content[0].text);

    expect(data.sessionId).toBe(sessionId);
    expect(data.status).toBe('in_progress');
    expect(data.completedSummary).toHaveLength(1);
    expect(data.completedSummary[0].phaseId).toBe('P1');
    expect(data.completedSummary[0].findingCount).toBe(2);
    expect(data.completedSummary[0].topFindings).toHaveLength(2);
    expect(data.currentPhase).toEqual({ id: 'P2', name: 'Testing Coverage Analysis' });
    expect(data.remainingPhases).toEqual(['P2', 'P3']);
    expect(data.fixProgress).toBeNull();
    expect(data.guidance).toContain('P2');
  });

  it('returns empty summary for fresh session', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2']);

    const result = handleCompactContext({ sessionId });
    const data = JSON.parse(result.content[0].text);

    expect(data.completedSummary).toHaveLength(0);
    expect(data.currentPhase.id).toBe('P1');
    expect(data.remainingPhases).toEqual(['P1', 'P2']);
  });

  it('shows null currentPhase when all phases complete', () => {
    const sessionId = startAndGetSessionId(['P1']);
    handleNextPhase({ sessionId, completedPhaseId: 'P1', findings: SAMPLE_FINDINGS });

    const result = handleCompactContext({ sessionId });
    const data = JSON.parse(result.content[0].text);

    expect(data.status).toBe('complete');
    expect(data.currentPhase).toBeNull();
    expect(data.remainingPhases).toEqual([]);
    expect(data.guidance).toContain('report');
  });

  it('handles skipped phases', () => {
    const sessionId = startAndGetSessionId(['P1', 'P2']);
    handleSkipPhase({ sessionId, phaseId: 'P1', reason: 'Not applicable' });

    const result = handleCompactContext({ sessionId });
    const data = JSON.parse(result.content[0].text);

    expect(data.completedSummary).toHaveLength(1);
    expect(data.completedSummary[0].phaseId).toBe('P1');
    expect(data.completedSummary[0].findingCount).toBe(0);
    expect(data.currentPhase.id).toBe('P2');
  });
});
