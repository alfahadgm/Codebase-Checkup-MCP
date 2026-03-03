import { PhaseConfig } from '../session/types.js';
import { logger } from './logger.js';

export interface FilterResult {
  phases: PhaseConfig[];
  invalidIds: string[];
}

export const ALL_PHASES: PhaseConfig[] = [
  {
    id: 'P1',
    name: 'Dead Code Detection',
    slug: 'dead_code',
    description:
      'Identifies unused code, orphaned files, dead exports, and unreachable branches. Findings here are excluded from all later phases.',
    order: 1,
  },
  {
    id: 'P2',
    name: 'Testing Coverage Analysis',
    slug: 'testing',
    description:
      'Analyzes test coverage gaps, missing test types, untested edge cases, and test quality issues. Calibrates severity for all later phases.',
    order: 2,
  },
  {
    id: 'P3',
    name: 'Logic Gaps & Business Logic',
    slug: 'logic_gaps',
    description:
      'Identifies business logic errors, missing validations, race conditions, incorrect state transitions, and edge cases.',
    order: 3,
  },
  {
    id: 'P4',
    name: 'API Integration & Contracts',
    slug: 'api_integration',
    description:
      'Validates API contracts, request/response mismatches, missing error handling on API calls, auth issues, and endpoint security.',
    order: 4,
  },
  {
    id: 'P5',
    name: 'System Architecture',
    slug: 'architecture',
    description:
      'Reviews architectural patterns, dependency structure, separation of concerns, scalability issues, and technical debt.',
    order: 5,
  },
  {
    id: 'P6',
    name: 'Error Handling & Fault Tolerance',
    slug: 'error_handling',
    description:
      'Audits error handling completeness, missing try/catch, unhandled promise rejections, retry logic, and graceful degradation.',
    order: 6,
  },
  {
    id: 'P7',
    name: 'UX & Usability',
    slug: 'ux_usability',
    description:
      'Identifies user-facing issues: missing loading states, poor error messages, accessibility gaps, broken flows, and client-side vulnerabilities.',
    order: 7,
  },
  {
    id: 'P8',
    name: 'Missing UX Capabilities',
    slug: 'missing_ux',
    description:
      'Finds gaps between backend capabilities and frontend exposure — features that exist server-side but lack UI, or UI that calls nonexistent endpoints.',
    order: 8,
  },
  {
    id: 'P9',
    name: 'Performance Bottlenecks',
    slug: 'performance',
    description:
      'Detects N+1 queries, missing indexes, unbounded loops, memory leaks, large bundle sizes, and unnecessary re-renders.',
    order: 9,
  },
  {
    id: 'P10',
    name: 'Synthesis & Remediation Roadmap',
    slug: 'synthesis',
    description:
      'Aggregates all findings into an executive summary with a prioritized, phased remediation plan sorted by impact and effort.',
    order: 10,
  },
];

export function getPhaseById(id: string): PhaseConfig | undefined {
  return ALL_PHASES.find((p) => p.id === id.toUpperCase());
}

export function getPhasesInRange(startFrom?: string, only?: string): PhaseConfig[] {
  if (only) {
    const phase = getPhaseById(only);
    return phase ? [phase] : [];
  }
  if (startFrom) {
    const startPhase = getPhaseById(startFrom);
    if (!startPhase) return [];
    return ALL_PHASES.filter((p) => p.order >= startPhase.order);
  }
  return [...ALL_PHASES];
}

export function filterPhases(phaseIds?: string[]): FilterResult {
  if (!phaseIds || phaseIds.length === 0) {
    return { phases: [...ALL_PHASES], invalidIds: [] };
  }
  const phases = ALL_PHASES.filter((p) => phaseIds.some((id) => id.toUpperCase() === p.id));
  const validIds = new Set(phases.map((p) => p.id));
  const invalidIds = phaseIds.filter((id) => !validIds.has(id.toUpperCase()));
  if (invalidIds.length > 0) {
    logger.warn('Unrecognized phase IDs dropped', { invalidIds });
  }
  return { phases, invalidIds };
}
