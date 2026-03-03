import { describe, it, expect } from 'vitest';
import { buildPhasePrompt, buildFindingSummary } from '../prompt-builder.js';
import { PhaseConfig, PhaseResult } from '../../session/types.js';

const makePhase = (id: string): PhaseConfig => ({
  id,
  name: `Phase ${id}`,
  slug: id.toLowerCase(),
  description: `Description for ${id}`,
  order: parseInt(id.replace('P', '')),
});

const makeResult = (phaseId: string, findings: string): PhaseResult => ({
  phaseId,
  findings,
  findingSummary: `### ${phaseId} Summary\nSome findings here`,
  completedAt: new Date(),
});

describe('buildPhasePrompt', () => {
  it('returns phase prompt with no prior findings', () => {
    const prompt = buildPhasePrompt(makePhase('P1'), []);
    expect(prompt).toContain('P1');
    expect(prompt).not.toContain('Prior Findings');
  });

  it('includes prior findings section when completedPhases exist', () => {
    const completed = [makeResult('P1', 'P1 findings')];
    const prompt = buildPhasePrompt(makePhase('P2'), completed);
    expect(prompt).toContain('Prior Findings');
    expect(prompt).toContain('P1 Summary');
  });

  it('returns error string for unknown phase ID', () => {
    const prompt = buildPhasePrompt(makePhase('P99'), []);
    expect(prompt).toContain('Unknown phase');
    expect(prompt).toContain('P99');
  });

  it('joins multiple prior findings with separators', () => {
    const completed = [makeResult('P1', 'P1 findings'), makeResult('P2', 'P2 findings')];
    const prompt = buildPhasePrompt(makePhase('P3'), completed);
    expect(prompt).toContain('P1 Summary');
    expect(prompt).toContain('P2 Summary');
  });
});

describe('buildFindingSummary', () => {
  it('delegates to extractCrossRefSummary', () => {
    const summary = buildFindingSummary('P1', '# P1: Test\n### P1.1: Finding\nDetails');
    expect(summary).toContain('P1');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('handles empty findings', () => {
    const summary = buildFindingSummary('P1', '');
    expect(summary).toBeDefined();
  });
});
