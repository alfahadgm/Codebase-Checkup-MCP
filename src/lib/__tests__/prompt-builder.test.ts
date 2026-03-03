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

/** Make a result with a remediation table so tiering functions can extract severity */
const makeResultWithTable = (phaseId: string): PhaseResult => {
  const findings = `# ${phaseId}: Test Phase\n## Findings\n### ${phaseId}.1: Test finding\n## Remediation Table\n| ID | Finding | Impact | Effort | Confidence | Cross-Refs |\n|---|---|---|---|---|---|\n| ${phaseId}.1 | Test finding | Data Loss | Quick Fix | Confirmed | — |`;
  const findingSummary = `# ${phaseId}: Test Phase\n\n## Remediation Table\n| ID | Finding | Impact | Effort | Confidence | Cross-Refs |\n|---|---|---|---|---|---|\n| ${phaseId}.1 | Test finding | Data Loss | Quick Fix | Confirmed | — |`;
  return {
    phaseId,
    findings,
    findingSummary,
    completedAt: new Date(),
  };
};

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

describe('buildPhasePrompt - contextBudget tiering', () => {
  it('full budget includes all summaries verbatim', () => {
    const completed = [makeResult('P1', 'f1'), makeResult('P2', 'f2'), makeResult('P3', 'f3')];
    const prompt = buildPhasePrompt(makePhase('P4'), completed, 'full');
    // All three summaries should appear as-is
    expect(prompt).toContain('P1 Summary');
    expect(prompt).toContain('P2 Summary');
    expect(prompt).toContain('P3 Summary');
  });

  it('normal budget with 3 phases: 2 recent full, 1 old table-only', () => {
    // 3 completed phases → recency: P1=2 (old), P2=1 (recent), P3=0 (most recent)
    // P1 should be table-only (recency 2, in 2-4 range), P2 and P3 should be full
    const completed = [
      makeResultWithTable('P1'),
      makeResultWithTable('P2'),
      makeResultWithTable('P3'),
    ];
    const prompt = buildPhasePrompt(makePhase('P4'), completed, 'normal');
    // P2 and P3 are recent — their full summaries should appear
    expect(prompt).toContain('# P2: Test Phase');
    expect(prompt).toContain('# P3: Test Phase');
    // P1 is mid-range — should be table-only (no title line)
    expect(prompt).not.toContain('# P1: Test Phase');
    // But P1's table data should still appear
    expect(prompt).toContain('P1.1');
  });

  it('normal budget with 6+ phases compresses oldest to one-liners', () => {
    const completed = Array.from({ length: 7 }, (_, i) => makeResultWithTable(`P${i + 1}`));
    const prompt = buildPhasePrompt(makePhase('P8'), completed, 'normal');
    // P6, P7 are recent (recency 0, 1) — full summary with title
    expect(prompt).toContain('# P7: Test Phase');
    expect(prompt).toContain('# P6: Test Phase');
    // P3, P4, P5 are mid-range (recency 2, 3, 4) — table-only
    expect(prompt).not.toContain('# P3: Test Phase');
    expect(prompt).toContain('P3.1');
    // P1, P2 are old (recency 5, 6) — one-liners
    expect(prompt).toContain('**P1:**');
    expect(prompt).toContain('**P2:**');
    expect(prompt).toContain('1 finding');
  });

  it('compact budget: only most recent gets full summary', () => {
    const completed = [
      makeResultWithTable('P1'),
      makeResultWithTable('P2'),
      makeResultWithTable('P3'),
    ];
    const prompt = buildPhasePrompt(makePhase('P4'), completed, 'compact');
    // Only P3 (recency 0) should have full summary
    expect(prompt).toContain('# P3: Test Phase');
    // P1, P2 should be one-liners
    expect(prompt).toContain('**P1:**');
    expect(prompt).toContain('**P2:**');
    expect(prompt).not.toContain('# P1: Test Phase');
    expect(prompt).not.toContain('# P2: Test Phase');
  });

  it('P10 always uses full budget regardless of parameter', () => {
    const completed = Array.from({ length: 9 }, (_, i) => makeResultWithTable(`P${i + 1}`));
    const prompt = buildPhasePrompt(makePhase('P10'), completed, 'compact');
    // Despite compact budget, P10 should get full summaries
    expect(prompt).toContain('# P1: Test Phase');
    expect(prompt).toContain('# P9: Test Phase');
  });

  it('defaults to normal budget', () => {
    const completed = [
      makeResultWithTable('P1'),
      makeResultWithTable('P2'),
      makeResultWithTable('P3'),
    ];
    // No contextBudget argument → should default to 'normal'
    const prompt = buildPhasePrompt(makePhase('P4'), completed);
    // P1 should be compressed (not full title)
    expect(prompt).not.toContain('# P1: Test Phase');
    // P3 should be full
    expect(prompt).toContain('# P3: Test Phase');
  });
});
