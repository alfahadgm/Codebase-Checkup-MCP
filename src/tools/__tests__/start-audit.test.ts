import { describe, it, expect } from 'vitest';
import { handleStartAudit } from '../start-audit.js';

describe('handleStartAudit', () => {
  it('starts a full audit with no args', () => {
    const result = handleStartAudit({});
    expect(result.content).toHaveLength(2);

    const meta = JSON.parse(result.content[0].text);
    expect(meta.sessionId).toMatch(/^checkup-/);
    expect(meta.totalPhases).toBe(10);
    expect(meta.currentPhase.id).toBe('P1');
    expect(meta.currentPhase.number).toBe(1);
    expect(meta.progress).toBeDefined();
  });

  it('starts from a specific phase', () => {
    const result = handleStartAudit({ startFrom: 'P8' });
    const meta = JSON.parse(result.content[0].text);
    expect(meta.totalPhases).toBe(3); // P8, P9, P10
    expect(meta.currentPhase.id).toBe('P8');
  });

  it('runs specific phases', () => {
    const result = handleStartAudit({ phases: ['P1', 'P5', 'P10'] });
    const meta = JSON.parse(result.content[0].text);
    expect(meta.totalPhases).toBe(3);
    expect(meta.currentPhase.id).toBe('P1');
  });

  it('returns error for invalid phases', () => {
    const result = handleStartAudit({ phases: ['INVALID'] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No valid phases');
  });

  it('includes audit prompt in second content block', () => {
    const result = handleStartAudit({});
    expect(result.content[1].text).toContain('Audit Prompt');
    expect(result.content[1].text).toContain('Dead Code');
  });

  it('includes directive nextStep language', () => {
    const result = handleStartAudit({});
    const meta = JSON.parse(result.content[0].text);
    expect(meta.nextStep).toContain('Immediately');
  });
});
