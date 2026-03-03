import { PhaseConfig, PhaseResult } from '../session/types.js';
import { PHASE_PROMPTS } from '../prompts/templates/index.js';
import { extractCrossRefSummary } from './cross-reference.js';

/**
 * Build the full prompt for a given phase, including:
 * - The phase-specific audit prompt
 * - Cross-reference context from all completed prior phases
 */
export function buildPhasePrompt(phase: PhaseConfig, completedPhases: PhaseResult[]): string {
  const promptFn = PHASE_PROMPTS[phase.id];
  if (!promptFn) {
    return `Unknown phase: ${phase.id}. Available phases: ${Object.keys(PHASE_PROMPTS).join(', ')}`;
  }

  let priorFindings: string | undefined;

  if (completedPhases.length > 0) {
    const summaries = completedPhases.map((p) => p.findingSummary);
    priorFindings = summaries.join('\n\n---\n\n');
  }

  return promptFn({ priorFindings });
}

/**
 * Build a compact summary of prior findings for cross-referencing.
 * Called when a phase is completed, before storing.
 */
export function buildFindingSummary(phaseId: string, findings: string): string {
  return extractCrossRefSummary(phaseId, findings);
}
