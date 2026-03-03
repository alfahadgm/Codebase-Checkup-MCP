import { PhaseConfig, PhaseResult } from '../session/types.js';
import { PHASE_PROMPTS } from '../prompts/templates/index.js';
import {
  extractCrossRefSummary,
  compressSummaryToTableOnly,
  compressSummaryToOneLiner,
} from './cross-reference.js';

export type ContextBudget = 'compact' | 'normal' | 'full';

/**
 * Build the full prompt for a given phase, including:
 * - The phase-specific audit prompt
 * - Cross-reference context from completed prior phases, tiered by recency
 *
 * contextBudget controls how aggressively prior findings are compressed:
 * - 'full': all summaries at full fidelity (legacy behavior)
 * - 'normal': recent (last 2) full, mid-range (3rd-5th) table-only, old (6th+) one-liner
 * - 'compact': only last 1 full, everything else one-liner
 *
 * P10 (Synthesis) always uses 'full' regardless of the budget parameter,
 * since it needs all findings for aggregation.
 */
export function buildPhasePrompt(
  phase: PhaseConfig,
  completedPhases: PhaseResult[],
  contextBudget: ContextBudget = 'normal',
): string {
  const promptFn = PHASE_PROMPTS[phase.id];
  if (!promptFn) {
    return `Unknown phase: ${phase.id}. Available phases: ${Object.keys(PHASE_PROMPTS).join(', ')}`;
  }

  let priorFindings: string | undefined;

  if (completedPhases.length > 0) {
    // P10 always gets full context for synthesis
    const effectiveBudget = phase.id === 'P10' ? 'full' : contextBudget;
    priorFindings = buildTieredSummaries(completedPhases, effectiveBudget);
  }

  return promptFn({ priorFindings });
}

/**
 * Build tiered prior-findings summaries based on the context budget.
 * Phases are ordered most-recent-first for tiering, then re-joined in original order.
 */
function buildTieredSummaries(completedPhases: PhaseResult[], budget: ContextBudget): string {
  if (budget === 'full') {
    return completedPhases.map((p) => p.findingSummary).join('\n\n---\n\n');
  }

  const total = completedPhases.length;
  const parts: string[] = [];

  for (let i = 0; i < total; i++) {
    const recency = total - 1 - i; // 0 = most recent, higher = older
    const phase = completedPhases[i];

    if (budget === 'compact') {
      // compact: only the most recent gets full summary
      parts.push(
        recency === 0
          ? phase.findingSummary
          : compressSummaryToOneLiner(phase.phaseId, phase.findings),
      );
    } else {
      // normal: last 2 full, 3rd-5th table-only, 6th+ one-liner
      if (recency < 2) {
        parts.push(phase.findingSummary);
      } else if (recency < 5) {
        parts.push(compressSummaryToTableOnly(phase.findingSummary));
      } else {
        parts.push(compressSummaryToOneLiner(phase.phaseId, phase.findings));
      }
    }
  }

  return parts.join('\n\n---\n\n');
}

/**
 * Build a compact summary of prior findings for cross-referencing.
 * Called when a phase is completed, before storing.
 */
export function buildFindingSummary(phaseId: string, findings: string): string {
  return extractCrossRefSummary(phaseId, findings);
}
