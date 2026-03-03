import { z } from 'zod';
import { getSession, completePhase } from '../session/manager.js';
import { buildPhasePrompt } from '../lib/prompt-builder.js';
import { findingFormat } from '../prompts/templates/finding-format.js';
import { validateFindings } from '../lib/findings-validator.js';

export const nextPhaseSchema = z.object({
  sessionId: z.string().describe('The session ID returned by checkup_start_audit.'),
  completedPhaseId: z.string().describe('The phase ID that was just completed (e.g., "P1").'),
  findings: z
    .string()
    .max(500_000, 'Findings exceed 500KB limit. Please condense your report.')
    .describe('The full markdown findings report you produced for this phase.'),
});

export type NextPhaseInput = z.infer<typeof nextPhaseSchema>;

export function handleNextPhase(input: NextPhaseInput) {
  const session = getSession(input.sessionId);
  if (!session) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: Session "${input.sessionId}" not found. It may have expired (sessions last 2 hours). Start a new audit with checkup_start_audit.`,
        },
      ],
      isError: true,
    };
  }

  const updated = completePhase(input.sessionId, input.completedPhaseId, input.findings);
  if (!updated) {
    const currentPhase = session.phases[session.currentPhaseIndex];
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: Cannot complete phase "${input.completedPhaseId}". The current phase is "${currentPhase?.id ?? 'none'}" (${currentPhase?.name ?? 'audit may be complete'}). You must complete phases in order.`,
        },
      ],
      isError: true,
    };
  }

  const completedCount = updated.completedPhases.length;
  const totalCount = updated.phases.length;
  const warnings = validateFindings(input.completedPhaseId.toUpperCase(), input.findings);

  // Build progress summary
  const progressSummary = `Completed ${completedCount}/${totalCount} phases. Findings so far: ${updated.completedPhases.map((p) => `${p.phaseId}`).join(', ')}.`;

  if (updated.status === 'complete') {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              isComplete: true,
              progressSummary,
              ...(warnings.length > 0 ? { warnings } : {}),
              nextStep: `All phases complete! Call checkup_get_report with sessionId="${updated.id}" to get the final aggregated report.`,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  // Get next phase
  const nextPhase = updated.phases[updated.currentPhaseIndex];
  const prompt = buildPhasePrompt(nextPhase, updated.completedPhases);
  const outputFmt = findingFormat(nextPhase.id, nextPhase.name);

  const priorFindingSummaries = updated.completedPhases.map((p) => {
    const shortSummary = p.findingSummary.split('\n').slice(0, 5).join(' ');
    const truncated = shortSummary.length > 500 ? shortSummary.slice(0, 500) + '...' : shortSummary;
    return `**${p.phaseId}:** ${truncated}`;
  });

  const completedIds = updated.completedPhases.map((p) => p.phaseId);

  const result = {
    isComplete: false,
    currentPhase: {
      id: nextPhase.id,
      name: nextPhase.name,
      description: nextPhase.description,
      number: updated.currentPhaseIndex + 1,
    },
    progress: {
      current: updated.currentPhaseIndex + 1,
      total: totalCount,
      percent: Math.round((completedCount / totalCount) * 100 * 10) / 10,
      completed: completedIds,
    },
    progressSummary,
    priorFindingSummaries,
    ...(warnings.length > 0 ? { warnings } : {}),
    nextStep: `Immediately analyze the codebase following the prompt below, then call checkup_next_phase with sessionId="${updated.id}", completedPhaseId="${nextPhase.id}", and your findings.`,
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
      {
        type: 'text' as const,
        text: `\n---\n\n## Audit Prompt for ${nextPhase.id}: ${nextPhase.name}\n\n${prompt}\n\n${outputFmt}`,
      },
    ],
  };
}
