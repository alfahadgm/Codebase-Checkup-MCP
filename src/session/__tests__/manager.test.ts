import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSession, getSession, completePhase } from '../manager.js';
import { PhaseConfig } from '../types.js';

const makePhases = (ids: string[]): PhaseConfig[] =>
  ids.map((id, i) => ({
    id,
    name: `Phase ${id}`,
    slug: id.toLowerCase(),
    description: `Description for ${id}`,
    order: i + 1,
  }));

describe('createSession', () => {
  it('creates a session with correct initial state', () => {
    const phases = makePhases(['P1', 'P2', 'P3']);
    const session = createSession(phases);

    expect(session.id).toMatch(/^checkup-/);
    expect(session.phases).toHaveLength(3);
    expect(session.currentPhaseIndex).toBe(0);
    expect(session.completedPhases).toEqual([]);
    expect(session.status).toBe('in_progress');
  });

  it('generates unique session IDs', () => {
    const phases = makePhases(['P1']);
    const s1 = createSession(phases);
    const s2 = createSession(phases);
    expect(s1.id).not.toBe(s2.id);
  });
});

describe('getSession', () => {
  it('retrieves an existing session', () => {
    const session = createSession(makePhases(['P1']));
    const retrieved = getSession(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(session.id);
  });

  it('returns undefined for nonexistent session', () => {
    expect(getSession('nonexistent-id')).toBeUndefined();
  });
});

describe('completePhase', () => {
  it('completes the current phase and advances index', () => {
    const session = createSession(makePhases(['P1', 'P2']));
    const findings = '# P1: Test\n## Remediation Table\n| ID | Finding |\n|---|---|\n| P1.1 | test |';

    const updated = completePhase(session.id, 'P1', findings);
    expect(updated).toBeDefined();
    expect(updated!.completedPhases).toHaveLength(1);
    expect(updated!.completedPhases[0].phaseId).toBe('P1');
    expect(updated!.currentPhaseIndex).toBe(1);
    expect(updated!.status).toBe('in_progress');
  });

  it('marks session complete when last phase is done', () => {
    const session = createSession(makePhases(['P1']));
    const updated = completePhase(session.id, 'P1', 'findings');
    expect(updated!.status).toBe('complete');
  });

  it('handles case-insensitive phase IDs', () => {
    const session = createSession(makePhases(['P1', 'P2']));
    const updated = completePhase(session.id, 'p1', 'findings');
    expect(updated).toBeDefined();
    expect(updated!.completedPhases[0].phaseId).toBe('P1');
  });

  it('returns undefined for invalid session', () => {
    expect(completePhase('invalid', 'P1', 'findings')).toBeUndefined();
  });

  it('stores finding summary for cross-referencing', () => {
    const session = createSession(makePhases(['P1', 'P2']));
    const findings = '# P1: Dead Code\n### P1.1: Unused\nSome details';
    const updated = completePhase(session.id, 'P1', findings);
    expect(updated!.completedPhases[0].findingSummary).toBeTruthy();
  });

  it('completes multiple phases sequentially', () => {
    const session = createSession(makePhases(['P1', 'P2', 'P3']));
    completePhase(session.id, 'P1', 'P1 findings');
    completePhase(session.id, 'P2', 'P2 findings');
    const updated = completePhase(session.id, 'P3', 'P3 findings');

    expect(updated!.completedPhases).toHaveLength(3);
    expect(updated!.status).toBe('complete');
  });

  it('rejects completing a non-current phase', () => {
    const session = createSession(makePhases(['P1', 'P2', 'P3']));
    // Try to complete P3 when current is P1
    const result = completePhase(session.id, 'P3', 'findings');
    expect(result).toBeUndefined();
    // Session should not have advanced
    const s = getSession(session.id);
    expect(s!.currentPhaseIndex).toBe(0);
    expect(s!.completedPhases).toHaveLength(0);
  });

  it('uses canonical phase ID from config, not user input', () => {
    const session = createSession(makePhases(['P1', 'P2']));
    const updated = completePhase(session.id, 'p1', 'findings');
    expect(updated).toBeDefined();
    // Should use the config's "P1" not the user's "p1"
    expect(updated!.completedPhases[0].phaseId).toBe('P1');
  });
});

describe('session TTL cleanup', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('expires sessions after 2 hours via getSession', () => {
    const session = createSession(makePhases(['P1']));
    expect(getSession(session.id)).toBeDefined();

    // Advance past 2-hour TTL
    vi.advanceTimersByTime(2 * 60 * 60 * 1000 + 1);
    expect(getSession(session.id)).toBeUndefined();
  });

  it('keeps sessions alive within the TTL window', () => {
    const session = createSession(makePhases(['P1']));

    // Advance to just under 2 hours
    vi.advanceTimersByTime(2 * 60 * 60 * 1000 - 1000);
    expect(getSession(session.id)).toBeDefined();
  });
});
