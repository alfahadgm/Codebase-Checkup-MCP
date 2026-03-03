import { describe, it, expect } from 'vitest';
import { ALL_PHASES, getPhaseById, getPhasesInRange, filterPhases } from '../phase-config.js';

describe('ALL_PHASES', () => {
  it('has 10 phases', () => {
    expect(ALL_PHASES).toHaveLength(10);
  });

  it('phases are ordered 1-10', () => {
    const orders = ALL_PHASES.map((p) => p.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('all phases have required fields', () => {
    for (const phase of ALL_PHASES) {
      expect(phase.id).toMatch(/^P\d+$/);
      expect(phase.name).toBeTruthy();
      expect(phase.slug).toBeTruthy();
      expect(phase.description).toBeTruthy();
    }
  });
});

describe('getPhaseById', () => {
  it('finds phase by exact ID', () => {
    const phase = getPhaseById('P1');
    expect(phase).toBeDefined();
    expect(phase!.name).toBe('Dead Code Detection');
  });

  it('is case-insensitive', () => {
    expect(getPhaseById('p3')).toBeDefined();
    expect(getPhaseById('p3')!.id).toBe('P3');
  });

  it('returns undefined for invalid ID', () => {
    expect(getPhaseById('P99')).toBeUndefined();
    expect(getPhaseById('')).toBeUndefined();
  });
});

describe('getPhasesInRange', () => {
  it('returns all phases when no args', () => {
    expect(getPhasesInRange()).toHaveLength(10);
  });

  it('returns single phase with only', () => {
    const phases = getPhasesInRange(undefined, 'P5');
    expect(phases).toHaveLength(1);
    expect(phases[0].id).toBe('P5');
  });

  it('returns phases from startFrom onwards', () => {
    const phases = getPhasesInRange('P8');
    expect(phases).toHaveLength(3);
    expect(phases.map((p) => p.id)).toEqual(['P8', 'P9', 'P10']);
  });

  it('returns empty for invalid startFrom', () => {
    expect(getPhasesInRange('P99')).toEqual([]);
  });

  it('returns empty for invalid only', () => {
    expect(getPhasesInRange(undefined, 'INVALID')).toEqual([]);
  });
});

describe('filterPhases', () => {
  it('returns all phases when no IDs given', () => {
    expect(filterPhases().phases).toHaveLength(10);
    expect(filterPhases([]).phases).toHaveLength(10);
  });

  it('filters to specific phases', () => {
    const { phases } = filterPhases(['P1', 'P3', 'P9']);
    expect(phases).toHaveLength(3);
    expect(phases.map((p) => p.id)).toEqual(['P1', 'P3', 'P9']);
  });

  it('is case-insensitive', () => {
    const { phases } = filterPhases(['p1', 'p2']);
    expect(phases).toHaveLength(2);
  });

  it('ignores invalid IDs and reports them', () => {
    const { phases, invalidIds } = filterPhases(['P1', 'INVALID', 'P3']);
    expect(phases).toHaveLength(2);
    expect(invalidIds).toEqual(['INVALID']);
  });

  it('returns empty invalidIds when all IDs are valid', () => {
    const { invalidIds } = filterPhases(['P1', 'P2']);
    expect(invalidIds).toEqual([]);
  });
});
